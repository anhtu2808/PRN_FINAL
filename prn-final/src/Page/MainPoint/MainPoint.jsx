import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../Service/AxiosSetup";
import "./MainPoint.css";

const MainPoint = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const examId = searchParams.get("examId");
  const examStudentId = searchParams.get("examStudentId");
  const statusFilter = searchParams.get("status"); // Lấy status filter từ URL
  const openPlagiarism = searchParams.get("openPlagiarism"); // Kiểm tra có cần mở modal không
  
  const [student, setStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [filePath, setFilePath] = useState(null);
  const [score, setScore] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [loadingExam, setLoadingExam] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [isBaremCollapsed, setIsBaremCollapsed] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [comment, setComment] = useState("");
  
  // States for grade management
  const [gradeId, setGradeId] = useState(null);
  const [gradeDetailsMap, setGradeDetailsMap] = useState({}); // Map rubricId -> gradeDetailId
  const [gradeHistory, setGradeHistory] = useState([]); // Lịch sử chấm điểm
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const debounceTimerRef = useRef({}); // Map rubricId -> timer
  
  // States for plagiarism check
  const [docFileId, setDocFileId] = useState(null);
  const [showPlagiarismModal, setShowPlagiarismModal] = useState(false);
  const [plagiarismThreshold, setPlagiarismThreshold] = useState(30); // Nhập từ 1-100, chia 100 khi gửi API
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [similarityResult, setSimilarityResult] = useState(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!examId || !examStudentId) {
        setError("Không tìm thấy examId hoặc examStudentId.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        // Fetch tất cả students để kiểm tra student hiện tại
        const resAll = await axiosInstance.get(`/exams/${examId}/students`, {
          params: {
            Page: 1,
            Size: 1000,
          },
        });

        // Fetch students có status PARSED hoặc GRADED để navigation
        const res = await axiosInstance.get(`/exams/${examId}/students`, {
          params: {
            Page: 1,
            Size: 1000,
          },
        });

        if (res.data && res.data.data && res.data.data.result) {
          // Filter lại theo status filter từ URL
          // Nếu có statusFilter, chỉ lấy students có status đó
          // Nếu không có statusFilter, lấy cả PARSED và GRADED (backward compatibility)
          let studentsList;
          if (statusFilter && (statusFilter === "PARSED" || statusFilter === "GRADED")) {
            studentsList = res.data.data.result.filter(
              (s) => s.status === statusFilter && s.docFiles && s.docFiles.length > 0
            );
          } else {
            // Nếu không có statusFilter hoặc statusFilter không hợp lệ, lấy cả PARSED và GRADED
            studentsList = res.data.data.result.filter(
              (s) => (s.status === "PARSED" || s.status === "GRADED") && s.docFiles && s.docFiles.length > 0
            );
          }
          setStudents(studentsList);
          setTotalItems(studentsList.length);

          // Kiểm tra student hiện tại từ danh sách tất cả
          let foundStudent = null;
          if (resAll.data && resAll.data.data && resAll.data.data.result) {
            foundStudent = resAll.data.data.result.find(
              (s) => s.examStudentId === parseInt(examStudentId)
            );
          }

          if (foundStudent) {
            // Kiểm tra status
            // Nếu có statusFilter, kiểm tra status phải khớp
            if (statusFilter && (statusFilter === "PARSED" || statusFilter === "GRADED")) {
              if (foundStudent.status !== statusFilter) {
                setError(`Học sinh này không có status ${statusFilter}.`);
                setLoading(false);
                return;
              }
            } else {
              // Nếu không có statusFilter, cho phép PARSED và GRADED
              if (foundStudent.status !== "PARSED" && foundStudent.status !== "GRADED") {
                setError("Học sinh này chưa được phân tích (status không phải PARSED hoặc GRADED).");
                setLoading(false);
                return;
              }
            }

            // Kiểm tra docFiles
            if (!foundStudent.docFiles || foundStudent.docFiles.length === 0) {
              setError("Học sinh này chưa có file nào.");
              setLoading(false);
              return;
            }

            // Tìm index trong danh sách
            const foundIndex = studentsList.findIndex(
              (s) => s.examStudentId === parseInt(examStudentId)
            );

            if (foundIndex !== -1) {
              setStudent(foundStudent);
              setCurrentIndex(foundIndex);
              // Lấy filePath và docFileId từ phần tử cuối cùng của docFiles
              const lastFile = foundStudent.docFiles[foundStudent.docFiles.length - 1];
              setFilePath(lastFile.filePath);
              setDocFileId(lastFile.id || lastFile.docFileId);
            } else {
              setError("Không tìm thấy học sinh trong danh sách có thể chấm.");
            }
          } else {
            setError("Không tìm thấy học sinh.");
          }
        } else {
          setError("Không thể tải thông tin học sinh.");
        }
        setLoading(false);
      } catch (err) {
        console.error("Lỗi fetch học sinh:", err);
        setError("Không thể tải thông tin học sinh.");
        setLoading(false);
      }
    };

    fetchStudent();
  }, [examId, examStudentId, statusFilter]);

  // Fetch exam description
  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;

      try {
        setLoadingExam(true);
        const res = await axiosInstance.get(`/exams/${examId}`);
        if (res.data && res.data.data && res.data.data.description) {
          setExamDescription(res.data.data.description);
        }
        setLoadingExam(false);
      } catch (err) {
        console.error("Lỗi fetch exam description:", err);
        setLoadingExam(false);
      }
    };

    fetchExam();
  }, [examId]);

  // Fetch exam questions
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!examId) return;

      try {
        setLoadingQuestions(true);
        const res = await axiosInstance.get(`/exams/${examId}/questions`);
        if (res.data && res.data.data && res.data.data.questions) {
          // Sắp xếp questions theo questionNumber và rubrics theo orderIndex
          const sortedQuestions = res.data.data.questions
            .sort((a, b) => a.questionNumber - b.questionNumber)
            .map(q => ({
              ...q,
              rubrics: q.rubrics.sort((a, b) => a.orderIndex - b.orderIndex)
            }));
          setQuestions(sortedQuestions);
        } else {
          setQuestions([]);
        }
        setLoadingQuestions(false);
      } catch (err) {
        console.error("Lỗi fetch exam questions:", err);
        setLoadingQuestions(false);
        setQuestions([]);
      }
    };

    fetchQuestions();
  }, [examId]);

  // Tự động mở modal plagiarism khi quay lại từ trang chi tiết
  useEffect(() => {
    if (openPlagiarism === "1" && docFileId) {
      setShowPlagiarismModal(true);
      // Load lại similarityResult từ sessionStorage nếu có
      const savedResult = sessionStorage.getItem(`plagiarismResult_${docFileId}`);
      if (savedResult) {
        try {
          const parsedResult = JSON.parse(savedResult);
          setSimilarityResult(parsedResult);
        } catch (err) {
          console.error("Lỗi parse saved result:", err);
        }
      }
      // Xóa query parameter để không mở lại khi refresh
      const statusParam = statusFilter ? `&status=${statusFilter}` : "";
      navigate(`/main-point?examId=${examId}&examStudentId=${examStudentId}${statusParam}`, { replace: true });
    }
  }, [openPlagiarism, docFileId, examId, examStudentId, statusFilter, navigate]);

  // Fetch grade history from examStudentId
  const fetchGradeHistory = async (examStudentIdParam) => {
    try {
      const res = await axiosInstance.get(`/Grade/GetByExamStudentId/${examStudentIdParam}`, {
        params: {
          PageIndex: 1,
          PageSize: 12,
        },
      });
      
      if (res.data && res.data.data && res.data.data.result && res.data.data.result.length > 0) {
        const history = res.data.data.result;
        setGradeHistory(history);
        
        // Lấy record cuối cùng (lần gần nhất)
        const latestGrade = history[history.length - 1];
        const gradeIdFromResponse = latestGrade.id;
        setGradeId(gradeIdFromResponse);
        
        return { gradeId: gradeIdFromResponse, history };
      }
      setGradeHistory([]);
      return null;
    } catch (err) {
      console.error("Lỗi fetch grade history:", err);
      setGradeHistory([]);
      return null;
    }
  };

  // Fetch grade details from gradeId and load scores into inputs
  const fetchGradeDetails = async (gradeIdParam) => {
    try {
      const res = await axiosInstance.get(`/Grade/${gradeIdParam}`);
      
      if (res.data && res.data.data) {
        // Load comment nếu có
        if (res.data.data.comment) {
          setComment(res.data.data.comment);
        }
        
        if (res.data.data.details) {
          const detailsMap = {};
          const scoresMap = {};
          
          res.data.data.details.forEach((detail) => {
            detailsMap[detail.rubricId] = detail.id;
            // Load điểm vào input
            if (detail.score !== null && detail.score !== undefined) {
              scoresMap[detail.rubricId] = detail.score.toString();
            }
          });
          
          setGradeDetailsMap(detailsMap);
          // Load điểm vào state
          setScore(scoresMap);
          
          return detailsMap;
        }
      }
      return {};
    } catch (err) {
      console.error("Lỗi fetch grade details:", err);
      return {};
    }
  };

  // Update grade detail with debounce
  const updateGradeDetail = async (rubricId, scoreValue, gradeDetailId, gradeIdParam) => {
    try {
      const payload = {
        gradeId: gradeIdParam || gradeId,
        rubricId: rubricId,
        score: parseFloat(scoreValue) || 0,
        comment: "",
        autoDetectResult: "",
      };

      await axiosInstance.put(`/GradeDetail/${gradeDetailId}`, payload);
      console.log(`Đã cập nhật điểm cho rubricId ${rubricId}: ${scoreValue}`);
    } catch (err) {
      console.error(`Lỗi cập nhật điểm cho rubricId ${rubricId}:`, err);
    }
  };

  // Fetch gradeId from examStudentId (for handleInput)
  const fetchGradeId = async (examStudentIdParam) => {
    try {
      const res = await axiosInstance.get(`/Grade/GetByExamStudentId/${examStudentIdParam}`, {
        params: {
          PageIndex: 1,
          PageSize: 12,
        },
      });
      
      if (res.data && res.data.data && res.data.data.result && res.data.data.result.length > 0) {
        const latestGrade = res.data.data.result[res.data.data.result.length - 1];
        return latestGrade.id;
      }
      return null;
    } catch (err) {
      console.error("Lỗi fetch gradeId:", err);
      return null;
    }
  };


  const handleSimilarityCheck = async (docFileIdParam, threshold) => {
    try {
      const res = await axiosInstance.post(`/docfile/${docFileIdParam}/similarity-check`, {
        threshold: threshold
      });
      return res.data?.data || res.data;
    } catch (err) {
      console.error("Lỗi similarity check:", err);
      throw err;
    }
  };


  const handleCheckPlagiarism = async () => {
    if (!docFileId) {
      alert("Không tìm thấy docFileId");
      return;
    }

    try {
      setCheckingPlagiarism(true);
      setSimilarityResult(null);
      
      // Bước 1: Similarity check - chia threshold cho 100 để chuyển từ % sang decimal
      const thresholdDecimal = plagiarismThreshold / 100;
      const result = await handleSimilarityCheck(docFileId, thresholdDecimal);
      setSimilarityResult(result);
      // Lưu vào sessionStorage
      sessionStorage.setItem(`plagiarismResult_${docFileId}`, JSON.stringify(result));
    } catch (err) {
      console.error("Lỗi check đạo văn:", err);
      alert("Có lỗi xảy ra khi kiểm tra đạo văn. Vui lòng thử lại.");
    } finally {
      setCheckingPlagiarism(false);
    }
  };


  const handleSelectPair = (pair) => {
    // Lưu similarityResult vào sessionStorage trước khi navigate
    if (similarityResult) {
      sessionStorage.setItem(`plagiarismResult_${docFileId}`, JSON.stringify(similarityResult));
    }
    // Navigate đến trang chi tiết với thông tin cặp
    const pairData = encodeURIComponent(JSON.stringify(pair));
    const statusParam = statusFilter ? `&status=${statusFilter}` : "";
    navigate(`/plagiarism-detail?examId=${examId}&examStudentId=${examStudentId}&similarityResultId=${pair.resultId}&pairData=${pairData}${statusParam}`);
  };

  // Load grade from history (for modal)
  const loadGradeFromHistory = async (gradeIdParam) => {
    setGradeId(gradeIdParam);
    await fetchGradeDetails(gradeIdParam);
    // Attempt sẽ được cập nhật trong fetchGradeDetails
  };

  // Fetch gradeId and gradeDetails when examStudentId changes
  useEffect(() => {
    const initializeGradeData = async () => {
      if (!examStudentId) return;

      // Reset score and comment
      setScore({});
      setComment("");

      const result = await fetchGradeHistory(examStudentId);
      if (result && result.gradeId) {
        await fetchGradeDetails(result.gradeId);
      }
    };

    initializeGradeData();

    // Cleanup debounce timers on unmount
    return () => {
      Object.values(debounceTimerRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      debounceTimerRef.current = {};
    };
  }, [examStudentId]);

  const handleInput = (key, value) => {
    setScore((prev) => ({ ...prev, [key]: value }));
    setSaveMessage("");

    // Debounce update grade detail
    const rubricId = parseInt(key);
    const gradeDetailId = gradeDetailsMap[rubricId];

    if (!gradeDetailId || !gradeId) {
      // Nếu chưa có gradeDetailId hoặc gradeId, thử fetch lại
      const initializeAndUpdate = async () => {
        if (!gradeId) {
          const fetchedGradeId = await fetchGradeId(examStudentId);
          if (fetchedGradeId) {
            const detailsMap = await fetchGradeDetails(fetchedGradeId);
            const detailId = detailsMap[rubricId];
            if (detailId) {
              // Đợi một chút rồi update
              setTimeout(() => {
                updateGradeDetail(rubricId, value, detailId, fetchedGradeId);
              }, 500);
            }
          }
        } else if (!gradeDetailId) {
          const detailsMap = await fetchGradeDetails(gradeId);
          const detailId = detailsMap[rubricId];
          if (detailId) {
            setTimeout(() => {
              updateGradeDetail(rubricId, value, detailId, gradeId);
            }, 500);
          }
        }
      };
      initializeAndUpdate();
      return;
    }

    // Clear previous timer for this rubricId
    if (debounceTimerRef.current[rubricId]) {
      clearTimeout(debounceTimerRef.current[rubricId]);
    }

    // Set new timer
    debounceTimerRef.current[rubricId] = setTimeout(() => {
      updateGradeDetail(rubricId, value, gradeDetailId, gradeId);
      delete debounceTimerRef.current[rubricId];
    }, 500); // 500ms debounce
  };

  const calculateTotalScore = () => {
    let total = 0;
    questions.forEach((question) => {
      if (question.rubrics) {
        question.rubrics.forEach((rubric) => {
          const rubricScore = parseFloat(score[rubric.id]) || 0;
          total += rubricScore;
        });
      }
    });
    return total;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const totalScore = calculateTotalScore();
      const payload = {
        examStudentId: parseInt(examStudentId),
        totalScore: totalScore,
        comment: comment || "",
        gradedAt: new Date().toISOString(),
        gradedBy: "", // Có thể lấy từ user đang đăng nhập nếu có
        attempt: gradeHistory.length > 0 ? gradeHistory.length + 1 : 1,
        status: 1
      };
      
      // Nếu status là PARSED và có gradeId, dùng PUT để update
      if (student && student.status === "PARSED" && gradeId) {
        await axiosInstance.put(`/grade/${gradeId}`, payload);
      } else {
        // Nếu không phải PARSED hoặc chưa có gradeId, dùng POST để tạo mới
        payload.status = 1;
        await axiosInstance.post("/Grade", payload);
      }
      
      // Refresh lịch sử sau khi lưu
      await fetchGradeHistory(examStudentId);
      
      setSaveMessage("success");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Lỗi lưu điểm:", err);
      setSaveMessage("error");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getOfficeViewerUrl = (url) => {
    if (!url) return "";
    const encodedUrl = encodeURIComponent(url);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  const handleNext = () => {
    if (currentIndex < students.length - 1) {
      const nextStudent = students[currentIndex + 1];
      if (nextStudent && (nextStudent.status === "PARSED" || nextStudent.status === "GRADED") && nextStudent.docFiles && nextStudent.docFiles.length > 0) {
        const statusParam = statusFilter ? `&status=${statusFilter}` : "";
        navigate(`/main-point?examId=${examId}&examStudentId=${nextStudent.examStudentId}${statusParam}`);
        setScore({});
        setComment("");
        setSaveMessage("");
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevStudent = students[currentIndex - 1];
      if (prevStudent && (prevStudent.status === "PARSED" || prevStudent.status === "GRADED") && prevStudent.docFiles && prevStudent.docFiles.length > 0) {
        const statusParam = statusFilter ? `&status=${statusFilter}` : "";
        navigate(`/main-point?examId=${examId}&examStudentId=${prevStudent.examStudentId}${statusParam}`);
        setScore({});
        setComment("");
        setSaveMessage("");
      }
    }
  };

  const canGoNext = currentIndex >= 0 && currentIndex < students.length - 1;
  const canGoPrev = currentIndex > 0;

  return (
    <div
      className="container-fluid vh-100 d-flex flex-column p-0 bg-light"
    >
      {/* HEADER */}
      <div
        className="d-flex justify-content-between align-items-center p-4 shadow-sm bg-white border-bottom"
      >
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-outline-secondary mainpoint-btn-back"
            onClick={() => {
              const statusParam = statusFilter ? `&status=${statusFilter}` : "";
              navigate(`/list-student?examId=${examId}${statusParam}`);
            }}
            title="Quay lại danh sách học sinh"
          >
            <i className="bi bi-arrow-left me-1"></i>
            Danh sách
          </button>
          <div>
            <h4 className="mb-1 fw-bold mainpoint-header-title">
              {student ? `${student.studentName} (${student.studentCode})` : "Đang tải..."}
            </h4>
            {totalItems > 0 && currentIndex >= 0 && (
              <small className="text-muted">
                Bài {currentIndex + 1} / {totalItems}
              </small>
            )}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-warning mainpoint-btn-nav"
            onClick={() => {
              setShowPlagiarismModal(true);
              setSimilarityResult(null);
            }}
            title="Kiểm tra đạo văn"
            disabled={!docFileId}
          >
            <i className="bi bi-shield-check me-1"></i>
            Check đạo văn
          </button>
          <button
            className="btn btn-outline-info mainpoint-btn-nav"
            onClick={async () => {
              setShowHistoryModal(true);
              setLoadingHistory(true);
              // Fetch lại lịch sử khi mở modal
              await fetchGradeHistory(examStudentId);
              setLoadingHistory(false);
            }}
            title="Xem lịch sử chấm điểm"
          >
            <i className="bi bi-clock-history me-1"></i>
            Lịch sử chấm
          </button>
          <button
            className="btn btn-outline-primary mainpoint-btn-nav"
            onClick={handlePrev}
            disabled={!canGoPrev}
          >
            <i className="bi bi-chevron-left me-1"></i>
            Trước
          </button>
          <button
            className="btn btn-primary mainpoint-btn-nav"
            onClick={handleNext}
            disabled={!canGoNext}
          >
            Tiếp theo
            <i className="bi bi-chevron-right ms-1"></i>
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="row flex-grow-1 m-0 p-4">
        {/* LEFT SIDE (BAREM) */}
        <div 
          className={`mb-3 mb-md-0 ${isBaremCollapsed ? "col-lg-1 col-md-1" : "col-lg-3 col-md-4"}`}
          style={{
            transition: "all 0.3s ease-in-out"
          }}
        >
          <div
            className="p-4 rounded-4 shadow-sm bg-white border h-100"
            style={{
              position: "sticky",
              top: "20px",
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
              transition: "all 0.3s ease-in-out",
            }}
          >
            {isBaremCollapsed ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100">
                <button
                  className="btn btn-sm btn-outline-primary mb-3"
                  onClick={() => setIsBaremCollapsed(false)}
                  title="Mở rộng"
                  style={{ borderRadius: "8px" }}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
                <div className="text-center">
                  <i className="bi bi-clipboard-data text-primary" style={{ fontSize: "28px" }}></i>
                  <p className="mt-3 mb-0 small text-muted fw-semibold" style={{ 
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    fontSize: "11px",
                    letterSpacing: "2px"
                  }}>
                    BAREM ĐIỂM
                  </p>
                </div>
              </div>
            ) : (
              <>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="d-flex align-items-center">
                <i className="bi bi-clipboard-data me-2 text-primary mainpoint-section-icon"></i>
                <h5 className="mb-0 fw-bold mainpoint-section-title">
                  Barem điểm
                </h5>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setIsBaremCollapsed(true)}
                title="Thu gọn"
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
            </div>

            <div className="mb-3">
              <button
                className="btn btn-outline-info w-100"
                onClick={() => setShowDescriptionModal(true)}
                style={{ borderRadius: "10px" }}
              >
                <i className="bi bi-file-text me-2"></i>
                Xem đề bài
              </button>
            </div>

            {loadingQuestions ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2 small">Đang tải barem điểm...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-3">
                <i className="bi bi-inbox text-muted" style={{ fontSize: "24px" }}></i>
                <p className="text-muted mt-2 small">Chưa có barem điểm</p>
              </div>
            ) : (
              questions.map((question) => (
                <div key={question.id} className="mb-4 pb-3 border-bottom">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 fw-bold text-primary">
                      <i className="bi bi-question-circle me-2"></i>
                      Câu {question.questionNumber}: {question.questionText}
                    </h6>
                    <small className="text-muted">
                      Tối đa: {question.maxScore} điểm
                    </small>
                  </div>
                  
                  {question.rubrics && question.rubrics.length > 0 && (
                    <div className="ms-3">
                      {question.rubrics.map((rubric) => (
                        <div key={rubric.id} className="mb-3">
                          <label className="form-label fw-semibold mb-2 mainpoint-label" style={{ fontSize: "13px" }}>
                            <i className="bi bi-dot me-1 mainpoint-star-icon"></i>
                            {rubric.criterion}
                            <span className="text-muted ms-2">(Tối đa: {rubric.maxScore} điểm)</span>
                          </label>
                          <div className="position-relative">
                            <i className="bi bi-pencil position-absolute mainpoint-input-icon"></i>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max={rubric.maxScore}
                              className="form-control ps-5 mainpoint-input"
                              placeholder={`Nhập điểm (0 - ${rubric.maxScore})`}
                              value={score[rubric.id] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Validate max score
                                if (value === "" || (parseFloat(value) >= 0 && parseFloat(value) <= rubric.maxScore)) {
                                  handleInput(rubric.id, value);
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Hiển thị tổng điểm của question */}
                  <div className="mt-2 ms-3">
                    <small className="text-muted">
                      Tổng điểm: {
                        question.rubrics.reduce((sum, rubric) => {
                          const rubricScore = parseFloat(score[rubric.id]) || 0;
                          return sum + rubricScore;
                        }, 0).toFixed(1)
                      } / {question.maxScore}
                    </small>
                  </div>
                </div>
              ))
            )}

            {/* Tổng điểm và Comment */}
            {questions.length > 0 && (
              <div className="mt-4 pt-3 border-top">
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0 fw-bold text-success">
                      <i className="bi bi-calculator me-2"></i>
                      Tổng điểm:
                    </h6>
                    <h5 className="mb-0 fw-bold text-success">
                      {calculateTotalScore().toFixed(1)} / {
                        questions.reduce((sum, q) => sum + q.maxScore, 0)
                      }
                    </h5>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold mb-2 mainpoint-label">
                    <i className="bi bi-chat-left-text me-2"></i>
                    Nhận xét:
                  </label>
                  <textarea
                    className="form-control mainpoint-input"
                    rows="4"
                    placeholder="Nhập nhận xét về bài làm của học sinh..."
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setSaveMessage("");
                    }}
                    style={{
                      resize: "vertical",
                      minHeight: "100px"
                    }}
                  />
                </div>
              </div>
            )}

            {saveMessage === "success" && (
              <div className="alert alert-success d-flex align-items-center mb-3 mainpoint-alert">
                <i className="bi bi-check-circle-fill me-2"></i>
                <small>Lưu điểm thành công!</small>
              </div>
            )}

            {saveMessage === "error" && (
              <div className="alert alert-danger d-flex align-items-center mb-3 mainpoint-alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <small>Không thể lưu điểm!</small>
              </div>
            )}

            <button
              className="btn btn-success w-100 mt-3 fw-bold mainpoint-btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang lưu...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-2"></i>
                  LƯU ĐIỂM
                </>
              )}
            </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDE (BÀI LÀM) */}
        <div className={`${isBaremCollapsed ? "col-lg-11 col-md-11" : "col-lg-9 col-md-8"}`}
          style={{
            transition: "all 0.3s ease-in-out"
          }}
        >
          <div
            className="h-100 p-4 rounded-4 shadow-sm bg-white border overflow-auto"
          >
           

            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center mainpoint-loading-container">
                <div className="spinner-border text-primary mb-3 mainpoint-spinner" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Đang tải bài làm...</p>
              </div>
            ) : error ? (
              <div className="d-flex flex-column align-items-center justify-content-center mainpoint-empty-container">
                <i className="bi bi-exclamation-circle text-danger mainpoint-empty-icon"></i>
                <p className="text-danger mt-3">{error}</p>
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => navigate(`/list-student?examId=${examId}`)}
                >
                  Quay lại danh sách
                </button>
              </div>
            ) : filePath ? (
              <div className="w-100" style={{ height: "calc(100vh - 300px)", minHeight: "600px" }}>
                <iframe
                  src={getOfficeViewerUrl(filePath)}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #dee2e6",
                  }}
                  title="Office Document Viewer"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center mainpoint-empty-container">
                <i className="bi bi-exclamation-circle mainpoint-empty-icon"></i>
                <p className="text-muted mt-3">Không có file để hiển thị</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description Modal */}
      {showDescriptionModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDescriptionModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-file-text text-info me-2"></i>
                  Đề bài
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDescriptionModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {loadingExam ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-3">Đang tải đề bài...</p>
                  </div>
                ) : examDescription ? (
                  <div 
                    className="p-3 bg-light rounded-3"
                    style={{ 
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                      fontSize: "14px"
                    }}
                  >
                    {examDescription}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: "48px" }}></i>
                    <p className="text-muted mt-3">Không có đề bài</p>
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDescriptionModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHistoryModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-clock-history text-info me-2"></i>
                  Lịch sử chấm điểm
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowHistoryModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {loadingHistory ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-3">Đang tải lịch sử...</p>
                  </div>
                ) : gradeHistory.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: "48px" }}></i>
                    <p className="text-muted mt-3">Chưa có lịch sử chấm điểm</p>
                  </div>
                ) : (
                  <div className="list-group">
                    {gradeHistory.map((grade, index) => (
                      <div
                        key={grade.id}
                        className="list-group-item border rounded-3 mb-2 shadow-sm"
                        style={{
                          transition: "all 0.3s",
                          borderWidth: "1px",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                          e.currentTarget.style.borderColor = "#0d6efd";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#fff";
                          e.currentTarget.style.borderColor = "#dee2e6";
                        }}
                        onClick={async () => {
                          await loadGradeFromHistory(grade.id);
                          setShowHistoryModal(false);
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <span className="badge bg-primary">Lần {index + 1}</span>
                              <span className={`badge ${
                                grade.status === "GRADED" ? "bg-success" :
                                grade.status === "CREATED" ? "bg-warning" : "bg-secondary"
                              }`}>
                                {grade.status === "GRADED" ? "Đã chấm" :
                                 grade.status === "CREATED" ? "Đã tạo" : grade.status}
                              </span>
                            </div>
                            <div className="mb-2">
                              <small className="text-muted d-flex align-items-center">
                                <i className="bi bi-calendar3 me-2"></i>
                                {new Date(grade.gradedAt).toLocaleString("vi-VN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </small>
                            </div>
                            <div className="mb-2">
                              <small className="text-muted d-flex align-items-center">
                                <i className="bi bi-star-fill me-2 text-warning"></i>
                                Tổng điểm: <strong className="ms-1">{grade.totalScore}</strong>
                              </small>
                            </div>
                            {grade.comment && (
                              <div className="mt-2">
                                <small className="text-muted d-block">
                                  <i className="bi bi-chat-left-text me-1"></i>
                                  Nhận xét: {grade.comment}
                                </small>
                              </div>
                            )}
                            {index === gradeHistory.length - 1 && (
                              <div className="mt-2">
                                <small className="badge bg-info">Lần gần nhất</small>
                              </div>
                            )}
                          </div>
                          <div className="ms-3">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await loadGradeFromHistory(grade.id);
                                setShowHistoryModal(false);
                              }}
                            >
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              Tải lại
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plagiarism Check Modal */}
      {showPlagiarismModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !checkingPlagiarism) {
              setShowPlagiarismModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shield-check text-warning me-2"></i>
                  Kiểm tra đạo văn
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPlagiarismModal(false)}
                  disabled={checkingPlagiarism}
                ></button>
              </div>
              <div className="modal-body p-4">
                {/* Input threshold và nút check */}
                {!similarityResult && (
                  <div className="mb-4">
                    <label className="form-label fw-semibold mb-2">
                      <i className="bi bi-percent me-2"></i>
                      Ngưỡng phần trăm trùng bài (1 - 100):
                    </label>
                    <div className="d-flex gap-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="100"
                        className="form-control"
                        value={plagiarismThreshold}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= 100) {
                            setPlagiarismThreshold(value);
                          }
                        }}
                        placeholder="30"
                        disabled={checkingPlagiarism}
                        style={{ maxWidth: "200px" }}
                      />
                      <button
                        className="btn btn-warning"
                        onClick={handleCheckPlagiarism}
                        disabled={checkingPlagiarism || !docFileId}
                      >
                        {checkingPlagiarism ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Đang kiểm tra...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-search me-2"></i>
                            Kiểm tra
                          </>
                        )}
                      </button>
                    </div>
                    <small className="text-muted">
                      Nhập ngưỡng từ 1 đến 100. Ví dụ: 30 = 30% trùng
                    </small>
                  </div>
                )}

                {/* Kết quả kiểm tra */}
                {checkingPlagiarism && (
                  <div className="text-center py-4">
                    <div className="spinner-border text-warning mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Đang kiểm tra đạo văn...</p>
                  </div>
                )}

                {similarityResult && (
                  <div>
                    {/* Thông tin tổng quan */}
                    <div className="alert alert-info mb-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>
                            <i className="bi bi-info-circle me-2"></i>
                            Kết quả kiểm tra:
                          </strong>
                          <div className="mt-2">
                            <small>
                              Tổng số cặp đã kiểm tra: <strong>{similarityResult.totalPairsChecked || 0}</strong>
                            </small>
                            <br />
                            <small>
                              Số cặp nghi ngờ: <strong className="text-danger">{similarityResult.suspiciousPairsCount || 0}</strong>
                            </small>
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            setSimilarityResult(null);
                          }}
                        >
                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                          Kiểm tra lại
                        </button>
                      </div>
                    </div>

                    {/* Hiển thị danh sách các cặp nghi ngờ */}
                    {similarityResult.suspiciousPairs && similarityResult.suspiciousPairs.length > 0 ? (
                      <div className="list-group">
                        {similarityResult.suspiciousPairs.map((pair, index) => (
                          <div
                            key={index}
                            className="list-group-item border rounded-3 mb-2 shadow-sm"
                            style={{
                              transition: "all 0.3s",
                              borderWidth: "1px",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f8f9fa";
                              e.currentTarget.style.borderColor = "#0d6efd";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#fff";
                              e.currentTarget.style.borderColor = "#dee2e6";
                            }}
                            onClick={() => handleSelectPair(pair)}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <span className="badge bg-danger">Cặp #{index + 1}</span>
                                  <span className="badge bg-warning">
                                    Độ tương đồng: {(pair.similarityScore * 100).toFixed(2)}%
                                  </span>
                                </div>
                                <div className="row">
                                  <div className="col-md-6">
                                    <small className="text-muted d-block">
                                      <strong>Học sinh 1:</strong> {pair.student1Code}
                                    </small>
                                    <small className="text-muted d-block">
                                      <strong>File:</strong> {pair.docFile1Name}
                                    </small>
                                  </div>
                                  <div className="col-md-6">
                                    <small className="text-muted d-block">
                                      <strong>Học sinh 2:</strong> {pair.student2Code}
                                    </small>
                                    <small className="text-muted d-block">
                                      <strong>File:</strong> {pair.docFile2Name}
                                    </small>
                                  </div>
                                </div>
                              </div>
                              <div className="ms-3">
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectPair(pair);
                                  }}
                                >
                                  <i className="bi bi-eye me-1"></i>
                                  Xem chi tiết
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <i className="bi bi-check-circle text-success" style={{ fontSize: "48px" }}></i>
                        <p className="text-success mt-3 fw-bold">Không phát hiện đạo văn!</p>
                        <p className="text-muted">Không có cặp bài nào vượt quá ngưỡng {plagiarismThreshold}%</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPlagiarismModal(false);
                    setSimilarityResult(null);
                  }}
                  disabled={checkingPlagiarism}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPoint;
