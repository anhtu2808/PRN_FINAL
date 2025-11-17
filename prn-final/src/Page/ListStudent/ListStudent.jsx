import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../Service/AxiosSetup";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const ListStudent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const examId = searchParams.get("examId");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [size] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [activeStatus, setActiveStatus] = useState(() => {
    const urlStatus = searchParams.get("status");
    return urlStatus && ["ALL", "PARSED", "NOT_FOUND", "GRADED"].includes(urlStatus)
      ? urlStatus
      : "ALL";
  });
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentItems: 0,
  });

  // Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState(1); // 1 = description, 2 = details, 3 = zip
  const [excelUploaded, setExcelUploaded] = useState(false); // Track if Excel is uploaded
  
  // Exam Zips history states
  const [examZips, setExamZips] = useState([]);
  const [loadingExamZips, setLoadingExamZips] = useState(false);
  
  // Description upload states
  const [descriptionFile, setDescriptionFile] = useState(null);
  const [descriptionFileName, setDescriptionFileName] = useState("");
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionProgress, setDescriptionProgress] = useState(0);
  const [descriptionError, setDescriptionError] = useState("");
  const [descriptionSuccess, setDescriptionSuccess] = useState("");

  // Details (Excel) upload states
  const [detailsFile, setDetailsFile] = useState(null);
  const [detailsFileName, setDetailsFileName] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsProgress, setDetailsProgress] = useState(0);
  const [detailsError, setDetailsError] = useState("");
  const [detailsSuccess, setDetailsSuccess] = useState("");

  // ZIP upload states
  const [zipFile, setZipFile] = useState(null);
  const [zipFileName, setZipFileName] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipError, setZipError] = useState("");
  const [zipSuccess, setZipSuccess] = useState("");
  const [processingStatus, setProcessingStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);

  // Hàm fetch tổng số items mà không thay đổi view hiện tại
  const fetchTotalItems = async () => {
    if (!examId) return;

    try {
      const res = await axiosInstance.get(`/exams/${examId}/students`, {
        params: {
          Page: 1,
          Size: 1, // Chỉ cần 1 item để lấy totalItems
        },
      });
      
      if (res.data && res.data.data) {
        setPagination(prev => ({
          ...prev,
          totalItems: res.data.data.totalItems || 0,
        }));
      }
    } catch (err) {
      console.error("Lỗi fetch tổng số items:", err);
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      if (!examId) {
        setError("Không tìm thấy examId.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = {
          Page: page,
          Size: size,
        };
        
        // Chỉ thêm Status param nếu không phải "ALL"
        if (activeStatus !== "ALL") {
          params.Status = activeStatus;
        }
        
        if (searchTerm.trim()) {
          params.Search = searchTerm.trim();
        }

        const res = await axiosInstance.get(`/exams/${examId}/students`, {
          params,
        });
        
        if (res.data && res.data.data && res.data.data.result) {
          setStudents(res.data.data.result);
          setPagination({
            totalItems: res.data.data.totalItems || 0,
            totalPages: res.data.data.totalPages || 1,
            currentItems: res.data.data.currentItems || 0,
          });
        } else {
          setStudents([]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Lỗi fetch danh sách học sinh:", err);
        setError("Không thể tải danh sách học sinh.");
        setLoading(false);
      }
    };

    fetchStudents();
  }, [page, size, searchTerm, activeStatus, examId]);

  // Cleanup polling interval khi component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Fetch exam zips history
  useEffect(() => {
    const fetchExamZips = async () => {
      if (!examId) return;

      try {
        setLoadingExamZips(true);
        const res = await axiosInstance.get("/exam-zips", {
          params: {
            Page: 1,
            Size: 12,
            ExamId: examId,
          },
        });

        if (res.data && res.data.data && res.data.data.result) {
          setExamZips(res.data.data.result);
        } else {
          setExamZips([]);
        }
        setLoadingExamZips(false);
      } catch (err) {
        console.error("Lỗi fetch lịch sử upload:", err);
        setLoadingExamZips(false);
      }
    };

    fetchExamZips();
  }, [examId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    setPage(1); // Reset về trang 1 khi đổi status
    const newParams = { examId };
    if (status !== "ALL") {
      newParams.status = status;
    }
    setSearchParams(newParams); // Update URL
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Description upload handlers
  const handleDescriptionFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setDescriptionFile(selectedFile);
      setDescriptionFileName(selectedFile.name);
      setDescriptionError("");
    }
  };

  const removeDescriptionFile = () => {
    setDescriptionFile(null);
    setDescriptionFileName("");
  };

  const handleDescriptionSubmit = async (e) => {
    e.preventDefault();
    setDescriptionError("");
    setDescriptionSuccess("");
    setDescriptionProgress(0);

    if (!descriptionFile) {
      setDescriptionError("Vui lòng chọn file để upload.");
      return;
    }

    try {
      setDescriptionLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("file", descriptionFile);

      const response = await axiosInstance.put(
        `exams/${examId}/description`,
        formDataToSend,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setDescriptionProgress(percentCompleted);
            }
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        setDescriptionProgress(100);
        setDescriptionSuccess("Upload file description thành công!");
        setDescriptionFile(null);
        setDescriptionFileName("");
        setTimeout(() => {
          setDescriptionSuccess("");
        }, 3000);
      }
      setDescriptionLoading(false);
    } catch (err) {
      console.error("Lỗi upload file description:", err);
      if (err.response && err.response.data) {
        setDescriptionError(err.response.data.message || "Không thể upload file description.");
      } else {
        setDescriptionError("Không thể kết nối đến máy chủ.");
      }
      setDescriptionLoading(false);
      setDescriptionProgress(0);
    }
  };

  // Details (Excel) upload handlers
  const handleDetailsFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setDetailsFile(selectedFile);
      setDetailsFileName(selectedFile.name);
      setDetailsError("");
    }
  };

  const removeDetailsFile = () => {
    setDetailsFile(null);
    setDetailsFileName("");
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setDetailsError("");
    setDetailsSuccess("");
    setDetailsProgress(0);

    if (!detailsFile) {
      setDetailsError("Vui lòng chọn file Excel để upload.");
      return;
    }

    try {
      setDetailsLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("file", detailsFile);

      const response = await axiosInstance.post(
        `exams/${examId}/details`,
        formDataToSend,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setDetailsProgress(percentCompleted);
            }
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        setDetailsProgress(100);
        setExcelUploaded(true); // Mark Excel as uploaded
        setDetailsSuccess("Upload file Excel thành công!");
        setDetailsFile(null);
        setDetailsFileName("");
        // Fetch lại tổng số items để cập nhật pagination.totalItems
        await fetchTotalItems();
        setTimeout(() => {
          setDetailsSuccess("");
        }, 3000);
      }
      setDetailsLoading(false);
    } catch (err) {
      console.error("Lỗi upload file Excel:", err);
      if (err.response && err.response.data) {
        setDetailsError(err.response.data.message || "Không thể upload file Excel.");
      } else {
        setDetailsError("Không thể kết nối đến máy chủ.");
      }
      setDetailsLoading(false);
      setDetailsProgress(0);
    }
  };

  // ZIP upload handlers
  const handleZipFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setZipFile(selectedFile);
      setZipFileName(selectedFile.name);
      setZipError("");
    }
  };

  const removeZipFile = () => {
    setZipFile(null);
    setZipFileName("");
  };

  const checkStatus = async (zipId) => {
    try {
      const res = await axiosInstance.get(`/exam-zips/${zipId}/check-status`);
      const statusData = res.data?.data || res.data;
      if (statusData) {
        setProcessingStatus(statusData);
        return statusData;
      }
    } catch (err) {
      console.error("Lỗi check status:", err);
      let errorMessage = "Không thể kiểm tra trạng thái xử lý.";
      if (err.response && err.response.data) {
        if (err.response.data.message) {
          errorMessage += `\n${err.response.data.message}`;
        }
        if (err.response.data.errors) {
          errorMessage += `\nChi tiết: ${JSON.stringify(err.response.data.errors)}`;
        }
      }
      setZipError(errorMessage);
      setIsPolling(false);
      setZipLoading(false);
    }
    return null;
  };

  const startPolling = (zipId) => {
    setIsPolling(true);
    setZipLoading(false);
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    checkStatus(zipId).then((statusData) => {
      if (statusData) {
        const shouldContinue = handleStatusUpdate(statusData);
        if (!shouldContinue) {
          return;
        }
      }
    });

    pollingIntervalRef.current = setInterval(async () => {
      const statusData = await checkStatus(zipId);
      if (statusData) {
        const shouldContinue = handleStatusUpdate(statusData);
        if (!shouldContinue) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsPolling(false);
        }
      }
    }, 3000);
  };

  const handleStatusUpdate = (statusData) => {
    const parseStatus = statusData.parseStatus;
    if (parseStatus === "DONE" || parseStatus === 1) {
      setIsPolling(false);
      setZipLoading(false);
      setZipSuccess("Xử lý file ZIP thành công!");
      setTimeout(() => {
        setShowUploadModal(false); // Đóng modal
        // Refresh danh sách học sinh
        window.location.reload();
      }, 2000);
      return false;
    } else if (parseStatus === "ERROR") {
      setIsPolling(false);
      setZipLoading(false);
      // Hiển thị thông tin lỗi chi tiết
      let errorMessage = "Xử lý file ZIP gặp lỗi.";
      if (statusData.parseSummary) {
        errorMessage += `\n${statusData.parseSummary}`;
      }
      if (statusData.errors && statusData.errors.length > 0) {
        errorMessage += `\nLỗi: ${statusData.errors.join(", ")}`;
      }
      if (statusData.failedStudents && statusData.failedStudents.length > 0) {
        errorMessage += `\nHọc sinh không tìm thấy: ${statusData.failedStudents.join(", ")}`;
      }
      setZipError(errorMessage);
      return false;
    }
    return true;
  };

  const handleZipSubmit = async (e) => {
    e.preventDefault();
    setZipError("");
    setZipSuccess("");
    setZipProgress(0);

    if (!zipFile) {
      setZipError("Vui lòng chọn file ZIP để upload.");
      return;
    }

    try {
      setZipLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("file", zipFile);

      const response = await axiosInstance.post(
        `exams/${examId}/upload-zip`,
        formDataToSend,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setZipProgress(percentCompleted);
            }
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        const responseData = response.data?.data || response.data;
        if (responseData?.examZipId) {
          setZipProgress(100);
          // Refresh danh sách exam zips
          const refreshExamZips = async () => {
            try {
              const res = await axiosInstance.get("/exam-zips", {
                params: {
                  Page: 1,
                  Size: 12,
                  ExamId: examId,
                },
              });
              if (res.data && res.data.data && res.data.data.result) {
                setExamZips(res.data.data.result);
              }
            } catch (err) {
              console.error("Lỗi refresh lịch sử upload:", err);
            }
          };
          refreshExamZips();
          startPolling(responseData.examZipId);
        } else {
          setZipError("Không nhận được examZipId từ server.");
          setZipLoading(false);
        }
      }
    } catch (err) {
      console.error("Lỗi upload file ZIP:", err);
      if (err.response && err.response.data) {
        setZipError(err.response.data.message || "Không thể upload file ZIP.");
      } else {
        setZipError("Không thể kết nối đến máy chủ.");
      }
      setZipLoading(false);
      setZipProgress(0);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex flex-column p-0 bg-light">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center p-4 shadow-sm bg-white border-bottom">
        <div className="d-flex align-items-center gap-3">
          <h4 className="mb-0 fw-bold" style={{ color: "#333" }}>
            Danh sách học sinh
          </h4>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-muted">
            <small>Tổng số: {pagination.totalItems} học sinh</small>
          </div>
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setViewMode("grid")}
              style={{
                borderRadius: "10px 0 0 10px",
                padding: "8px 16px",
                fontWeight: "600",
              }}
              title="Dạng lưới"
            >
              <i className="bi bi-grid-3x3-gap"></i>
            </button>
            <button
              type="button"
              className={`btn ${viewMode === "list" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setViewMode("list")}
              style={{
                borderRadius: "0 10px 10px 0",
                padding: "8px 16px",
                fontWeight: "600",
              }}
              title="Dạng danh sách"
            >
              <i className="bi bi-list-ul"></i>
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowUploadModal(true);
              setActiveTab(1);
            }}
            style={{
              borderRadius: "10px",
              padding: "8px 20px",
              fontWeight: "600",
            }}
          >
            <i className="bi bi-cloud-upload me-2"></i>
            Upload
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate("/point-list")}
            style={{
              borderRadius: "10px",
              padding: "8px 20px",
              fontWeight: "600",
            }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Quay lại
          </button>
        </div>
      </div>

      {/* STATUS TABS */}
      <div className="p-4 bg-white border-bottom">
        <div className="btn-group w-100" role="group">
          <button
            type="button"
            className={`btn flex-grow-1 ${
              activeStatus === "ALL" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => handleStatusChange("ALL")}
            style={{
              borderRadius: "10px 0 0 10px",
              padding: "10px 16px",
              fontWeight: "600",
            }}
          >
            <i className="bi bi-list-ul me-2"></i>
            Tất cả
            {activeStatus === "ALL" && (
              <span className="badge bg-light text-secondary ms-2">
                {pagination.totalItems}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`btn flex-grow-1 ${
              activeStatus === "PARSED" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => handleStatusChange("PARSED")}
            style={{
              borderRadius: "0",
              padding: "10px 16px",
              fontWeight: "600",
            }}
          >
            <i className="bi bi-check-circle me-2"></i>
            Chờ chấm điểm
            {activeStatus === "PARSED" && (
              <span className="badge bg-light text-primary ms-2">
                {pagination.totalItems}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`btn flex-grow-1 ${
              activeStatus === "NOT_FOUND" ? "btn-danger" : "btn-outline-danger"
            }`}
            onClick={() => handleStatusChange("NOT_FOUND")}
            style={{
              borderRadius: "0",
              padding: "10px 16px",
              fontWeight: "600",
            }}
          >
            <i className="bi bi-x-circle me-2"></i>
            Chưa có bài
            {activeStatus === "NOT_FOUND" && (
              <span className="badge bg-light text-danger ms-2">
                {pagination.totalItems}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`btn flex-grow-1 ${
              activeStatus === "GRADED" ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => handleStatusChange("GRADED")}
            style={{
              borderRadius: "0 10px 10px 0",
              padding: "10px 16px",
              fontWeight: "600",
            }}
          >
            <i className="bi bi-star-fill me-2"></i>
            Đã chấm điểm
            {activeStatus === "GRADED" && (
              <span className="badge bg-light text-success ms-2">
                {pagination.totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="p-4 bg-white border-bottom">
        <form onSubmit={handleSearch} className="d-flex gap-2">
          <div className="position-relative flex-grow-1">
            <i className="bi bi-search position-absolute" style={{ 
              left: "15px", 
              top: "50%", 
              transform: "translateY(-50%)", 
              color: "#888",
              zIndex: 10
            }}></i>
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Tìm kiếm theo mã học sinh, tên hoặc email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                borderRadius: "10px",
                border: "2px solid #e0e0e0",
                padding: "10px 15px",
                transition: "all 0.3s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0d6efd")}
              onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              borderRadius: "10px",
              padding: "10px 20px",
              fontWeight: "600",
            }}
          >
            <i className="bi bi-search me-2"></i>
            Tìm kiếm
          </button>
          {searchTerm && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClearSearch}
              style={{
                borderRadius: "10px",
                padding: "10px 20px",
                fontWeight: "600",
              }}
            >
              <i className="bi bi-x-lg me-2"></i>
              Xóa
            </button>
          )}
        </form>
        {searchTerm && (
          <div className="mt-2">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Đang tìm kiếm: <strong>"{searchTerm}"</strong>
            </small>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex-grow-1 p-4 overflow-auto">
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "400px" }}>
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Đang tải danh sách học sinh...</p>
          </div>
        ) : error ? (
          <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "400px" }}>
            <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: "48px" }}></i>
            <p className="text-danger mt-3">{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "400px" }}>
            <i className="bi bi-inbox text-muted" style={{ fontSize: "48px" }}></i>
            <p className="text-muted mt-3">Chưa có học sinh nào</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="row g-3">
            {students.map((student) => (
              <div key={student.examStudentId} className="col-lg-4 col-md-6 col-sm-12">
                <div
                  className="card h-100 shadow-sm border"
                  style={{
                    borderRadius: "12px",
                    transition: "all 0.3s",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (student.docFiles && student.docFiles.length > 0) {
                      navigate(`/main-point?examId=${examId}&examStudentId=${student.examStudentId}`);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                  }}
                >
                  <div className="card-body p-4">
                    <div className="d-flex align-items-start mb-3">
                      <div className="d-inline-flex align-items-center justify-content-center me-3" style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        backgroundColor: "#e3f2fd",
                        color: "#1976d2"
                      }}>
                        <i className="bi bi-person-fill" style={{ fontSize: "24px" }}></i>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="card-title fw-bold mb-1" style={{ color: "#333" }}>
                          {student.studentName || `Học sinh ${student.examStudentId}`}
                        </h5>
                        {student.studentCode && (
                          <p className="text-muted mb-0 small fw-semibold">
                            <i className="bi bi-tag-fill me-1"></i>
                            {student.studentCode}
                          </p>
                        )}
                      </div>
                    </div>

                    {student.status && (
                      <div className="mb-2">
                        <span className={`badge ${
                          student.status === "PARSED" ? "bg-primary" :
                          student.status === "NOT_FOUND" ? "bg-danger" :
                          student.status === "GRADED" ? "bg-success" : "bg-secondary"
                        }`}>
                          {student.status === "PARSED" ? "Chờ chấm điểm" :
                           student.status === "NOT_FOUND" ? "Chưa có bài" :
                           student.status === "GRADED" ? "Đã chấm điểm" : student.status}
                        </span>
                      </div>
                    )}

                    {student.note && (
                      <div className="mb-2">
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-info-circle me-2"></i>
                          {student.note}
                        </small>
                      </div>
                    )}

                    {student.docFiles && student.docFiles.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-file-earmark me-2"></i>
                          {student.docFiles.length} file(s)
                        </small>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-top">
                      <small className="text-muted">
                        ID: {student.examStudentId}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="list-group">
            {students.map((student) => (
              <div
                key={student.examStudentId}
                className="list-group-item list-group-item-action border rounded-3 mb-2 shadow-sm"
                style={{
                  transition: "all 0.3s",
                  borderWidth: "1px",
                  cursor: student.docFiles && student.docFiles.length > 0 ? "pointer" : "default",
                }}
                onClick={() => {
                  if (student.docFiles && student.docFiles.length > 0) {
                    navigate(`/main-point?examId=${examId}&examStudentId=${student.examStudentId}`);
                  }
                }}
                onMouseEnter={(e) => {
                  if (student.docFiles && student.docFiles.length > 0) {
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                    e.currentTarget.style.borderColor = "#0d6efd";
                    e.currentTarget.style.transform = "translateX(5px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff";
                  e.currentTarget.style.borderColor = "#dee2e6";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center gap-3 flex-grow-1">
                    <div className="d-inline-flex align-items-center justify-content-center" style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      backgroundColor: "#e3f2fd",
                      color: "#1976d2"
                    }}>
                      <i className="bi bi-person-fill" style={{ fontSize: "24px" }}></i>
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="mb-1 fw-bold" style={{ color: "#333" }}>
                        {student.studentName || `Học sinh ${student.examStudentId}`}
                      </h5>
                      <div className="d-flex flex-wrap gap-3 align-items-center">
                        {student.studentCode && (
                          <small className="text-muted">
                            <i className="bi bi-tag-fill me-1"></i>
                            {student.studentCode}
                          </small>
                        )}
                        {student.status && (
                          <span className={`badge ${
                            student.status === "PARSED" ? "bg-primary" :
                            student.status === "NOT_FOUND" ? "bg-danger" :
                            student.status === "GRADED" ? "bg-success" : "bg-secondary"
                          }`}>
                            {student.status === "PARSED" ? "Chờ chấm điểm" :
                             student.status === "NOT_FOUND" ? "Chưa có bài" :
                             student.status === "GRADED" ? "Đã chấm điểm" : student.status}
                          </span>
                        )}
                        {student.note && (
                          <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            {student.note}
                          </small>
                        )}
                        {student.docFiles && student.docFiles.length > 0 && (
                          <small className="text-muted">
                            <i className="bi bi-file-earmark me-1"></i>
                            {student.docFiles.length} file(s)
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <small className="text-muted">ID: {student.examStudentId}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="d-flex justify-content-center align-items-center mt-4 gap-2">
            <button
              className="btn btn-outline-primary"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              style={{
                borderRadius: "10px",
                padding: "8px 16px",
                fontWeight: "600",
              }}
            >
              <i className="bi bi-chevron-left me-1"></i>
              Trước
            </button>

            <div className="d-flex align-items-center gap-2">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    className={`btn ${page === pageNum ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      borderRadius: "10px",
                      padding: "8px 12px",
                      fontWeight: "600",
                      minWidth: "40px",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              className="btn btn-outline-primary"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === pagination.totalPages}
              style={{
                borderRadius: "10px",
                padding: "8px 16px",
                fontWeight: "600",
              }}
            >
              Sau
              <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        )}

        {/* PAGINATION INFO */}
        {!loading && !error && students.length > 0 && (
          <div className="text-center mt-3">
            <small className="text-muted">
              Hiển thị {((page - 1) * size) + 1} - {Math.min(page * size, pagination.totalItems)} trong tổng số {pagination.totalItems} học sinh
            </small>
          </div>
        )}
      </div>

      {/* Upload Modal with Tabs */}
      {showUploadModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !descriptionLoading && !detailsLoading && !zipLoading && !isPolling) {
              setShowUploadModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-cloud-upload text-primary me-2"></i>
                  Upload Files
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUploadModal(false)}
                  disabled={descriptionLoading || detailsLoading || zipLoading || isPolling}
                ></button>
              </div>
              
              {/* Tabs */}
              <div className="border-bottom">
                <ul className="nav nav-tabs px-3" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 1 ? "active" : ""}`}
                      onClick={() => setActiveTab(1)}
                      disabled={descriptionLoading}
                      style={{ borderRadius: "10px 10px 0 0" }}
                    >
                      <i className="bi bi-file-text text-info me-2"></i>
                      Description
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 2 ? "active" : ""}`}
                      onClick={() => setActiveTab(2)}
                      disabled={detailsLoading}
                      style={{ borderRadius: "10px 10px 0 0" }}
                    >
                      <i className="bi bi-file-excel text-warning me-2"></i>
                      Danh sách sinh viên (Excel) {excelUploaded && <i className="bi bi-check-circle-fill text-success"></i>}
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    {!excelUploaded && pagination.totalItems <= 1 ? (
                      <div
                        title="Hãy upload file danh sách sinh viên trước"
                        style={{ 
                          display: "inline-block",
                          width: "100%"
                        }}
                      >
                        <button
                          className={`nav-link ${activeTab === 3 ? "active" : ""} disabled`}
                          disabled={true}
                          style={{ 
                            borderRadius: "10px 10px 0 0",
                            opacity: 0.5,
                            cursor: "not-allowed",
                            pointerEvents: "none"
                          }}
                        >
                          <i className="bi bi-file-zip text-primary me-2"></i>
                          File solution (ZIP)
                        </button>
                      </div>
                    ) : (
                      <button
                        className={`nav-link ${activeTab === 3 ? "active" : ""}`}
                        onClick={() => setActiveTab(3)}
                        disabled={zipLoading || isPolling}
                        style={{ 
                          borderRadius: "10px 10px 0 0"
                        }}
                      >
                        <i className="bi bi-file-zip text-primary me-2"></i>
                        File solution (ZIP)
                      </button>
                    )}
                  </li>
                </ul>
              </div>

              <div className="modal-body p-4">
                {/* Tab 1: Description */}
                {activeTab === 1 && (
                  <form onSubmit={handleDescriptionSubmit}>
                    {descriptionError && (
                      <div className="alert alert-danger d-flex align-items-center mb-3" style={{ borderRadius: "10px" }}>
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        <small>{descriptionError}</small>
                      </div>
                    )}
                    {descriptionSuccess && (
                      <div className="alert alert-success d-flex align-items-center mb-3" style={{ borderRadius: "10px" }}>
                        <i className="bi bi-check-circle-fill me-2"></i>
                        <small>{descriptionSuccess}</small>
                      </div>
                    )}
                    {descriptionLoading && descriptionProgress > 0 && descriptionProgress < 100 && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <small className="fw-semibold text-info">Đang upload...</small>
                          <small className="text-muted">{descriptionProgress}%</small>
                        </div>
                        <div className="progress" style={{ height: "8px", borderRadius: "10px" }}>
                          <div
                            className="progress-bar progress-bar-striped progress-bar-animated bg-info"
                            role="progressbar"
                            style={{ width: `${descriptionProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    <div className="mb-3">
                      {!descriptionFile ? (
                        <div className="border rounded-3 p-3 text-center" style={{ borderStyle: "dashed", cursor: "pointer" }}>
                          <input
                            type="file"
                            className="d-none"
                            id="description-file-input"
                            onChange={handleDescriptionFileChange}
                          />
                          <label htmlFor="description-file-input" className="mb-0" style={{ cursor: "pointer" }}>
                            <i className="bi bi-file-text" style={{ fontSize: "32px", color: "#888" }}></i>
                            <p className="mt-2 mb-0 text-muted">
                              <small>Click để chọn file</small>
                            </p>
                          </label>
                        </div>
                      ) : (
                        <div className="border rounded-3 p-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: "#e7f3ff" }}>
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-file-text text-info" style={{ fontSize: "24px" }}></i>
                            <div>
                              <div className="fw-semibold" style={{ fontSize: "14px" }}>{descriptionFileName}</div>
                              <small className="text-muted">{formatFileSize(descriptionFile.size)}</small>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={removeDescriptionFile}
                            disabled={descriptionLoading}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="btn btn-info w-100"
                      disabled={descriptionLoading || !descriptionFile}
                    >
                      {descriptionLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Đang upload...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cloud-upload me-2"></i>
                          Upload Description
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Tab 2: Details (Excel) */}
                {activeTab === 2 && (
                  <form onSubmit={handleDetailsSubmit}>
                  {detailsError && (
                    <div className="alert alert-danger d-flex align-items-center mb-3" style={{ borderRadius: "10px" }}>
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <small>{detailsError}</small>
                    </div>
                  )}
                  {detailsSuccess && (
                    <div className="alert alert-success d-flex align-items-center mb-3" style={{ borderRadius: "10px" }}>
                      <i className="bi bi-check-circle-fill me-2"></i>
                      <small>{detailsSuccess}</small>
                    </div>
                  )}
                  {detailsLoading && detailsProgress > 0 && detailsProgress < 100 && (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="fw-semibold text-warning">Đang upload...</small>
                        <small className="text-muted">{detailsProgress}%</small>
                      </div>
                      <div className="progress" style={{ height: "8px", borderRadius: "10px" }}>
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-warning"
                          role="progressbar"
                          style={{ width: `${detailsProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    {!detailsFile ? (
                      <div className="border rounded-3 p-3 text-center" style={{ borderStyle: "dashed", cursor: "pointer" }}>
                        <input
                          type="file"
                          className="d-none"
                          id="details-file-input"
                          onChange={handleDetailsFileChange}
                          accept=".xlsx,.xls"
                        />
                        <label htmlFor="details-file-input" className="mb-0" style={{ cursor: "pointer" }}>
                          <i className="bi bi-file-excel" style={{ fontSize: "32px", color: "#888" }}></i>
                          <p className="mt-2 mb-0 text-muted">
                            <small>Click để chọn file Excel</small>
                          </p>
                        </label>
                      </div>
                    ) : (
                      <div className="border rounded-3 p-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: "#fffbf0" }}>
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-file-excel text-warning" style={{ fontSize: "24px" }}></i>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: "14px" }}>{detailsFileName}</div>
                            <small className="text-muted">{formatFileSize(detailsFile.size)}</small>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={removeDetailsFile}
                          disabled={detailsLoading}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-warning w-100"
                    disabled={detailsLoading || !detailsFile}
                  >
                    {detailsLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang upload...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload me-2"></i>
                        Upload Excel
                      </>
                    )}
                    </button>
                  </form>
                )}

                {/* Tab 3: ZIP */}
                {activeTab === 3 && (
                  <>
                    {!excelUploaded && pagination.totalItems <= 1 && (
                      <div className="alert alert-warning d-flex align-items-center mb-3" style={{ borderRadius: "10px" }}>
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        <small>Hãy upload file danh sách sinh viên trước.</small>
                      </div>
                    )}
                    <form onSubmit={handleZipSubmit}>
                  {zipError && (
                    <div className="alert alert-danger mb-3" style={{ borderRadius: "10px" }}>
                      <div className="d-flex align-items-start">
                        <i className="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
                        <div className="flex-grow-1">
                          <small style={{ whiteSpace: "pre-wrap" }}>{zipError}</small>
                        </div>
                      </div>
                    </div>
                  )}
                  {zipSuccess && (
                    <div className="alert alert-success d-flex align-items-center mb-3" style={{ borderRadius: "10px" }}>
                      <i className="bi bi-check-circle-fill me-2"></i>
                      <small>{zipSuccess}</small>
                    </div>
                  )}
                  {zipLoading && zipProgress > 0 && zipProgress < 100 && (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="fw-semibold text-primary">Đang upload...</small>
                        <small className="text-muted">{zipProgress}%</small>
                      </div>
                      <div className="progress" style={{ height: "8px", borderRadius: "10px" }}>
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                          role="progressbar"
                          style={{ width: `${zipProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {isPolling && processingStatus && (
                    <div className="mb-3 p-3 bg-light rounded-3 border">
                      <div className="d-flex align-items-center mb-2">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <small className="fw-semibold text-primary">Đang xử lý file...</small>
                      </div>
                      {processingStatus.totalCount > 0 ? (
                        <div className="mb-2">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted">
                              Đã xử lý: {processingStatus.processedCount} / {processingStatus.totalCount}
                            </small>
                            <small className="text-muted">
                              {Math.round((processingStatus.processedCount / processingStatus.totalCount) * 100)}%
                            </small>
                          </div>
                          <div className="progress" style={{ height: "6px", borderRadius: "10px" }}>
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{ width: `${(processingStatus.processedCount / processingStatus.totalCount) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <small className="text-muted">
                            Đã xử lý: {processingStatus.processedCount} / {processingStatus.totalCount || 0}
                          </small>
                        </div>
                      )}
                      {processingStatus.parseSummary && (
                        <div className="mt-2">
                          <small className="text-muted d-block" style={{ 
                            whiteSpace: "pre-wrap",
                            fontSize: "12px"
                          }}>
                            <i className="bi bi-info-circle me-1"></i>
                            {processingStatus.parseSummary}
                          </small>
                        </div>
                      )}
                      {processingStatus.errors && processingStatus.errors.length > 0 && (
                        <div className="mt-2">
                          <small className="text-danger d-block">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            Lỗi: {processingStatus.errors.join(", ")}
                          </small>
                        </div>
                      )}
                      {processingStatus.failedStudents && processingStatus.failedStudents.length > 0 && (
                        <div className="mt-2">
                          <small className="text-warning d-block">
                            <i className="bi bi-person-x me-1"></i>
                            Học sinh không tìm thấy: {processingStatus.failedStudents.join(", ")}
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mb-3">
                    {!zipFile ? (
                      <div 
                        className="border rounded-3 p-3 text-center" 
                        style={{ 
                          borderStyle: "dashed", 
                          cursor: (!excelUploaded && pagination.totalItems <= 1) ? "not-allowed" : "pointer"
                        }}
                        title={(!excelUploaded && pagination.totalItems <= 1) ? "Hãy upload file danh sách sinh viên trước" : ""}
                      >
                        <input
                          type="file"
                          className="d-none"
                          id="zip-file-input"
                          onChange={handleZipFileChange}
                          accept=".zip"
                          disabled={isPolling || (!excelUploaded && pagination.totalItems <= 1)}
                        />
                        <label 
                          htmlFor="zip-file-input" 
                          className="mb-0" 
                          style={{ 
                            cursor: (isPolling || (!excelUploaded && pagination.totalItems <= 1)) ? "not-allowed" : "pointer",
                            opacity: (!excelUploaded && pagination.totalItems <= 1) ? 0.6 : 1
                          }}
                          onClick={(e) => {
                            if (!excelUploaded && pagination.totalItems <= 1) {
                              e.preventDefault();
                            }
                          }}
                          title={(!excelUploaded && pagination.totalItems <= 1) ? "Hãy upload file danh sách sinh viên trước" : ""}
                        >
                          <i className="bi bi-file-zip" style={{ fontSize: "32px", color: "#888" }}></i>
                          <p className="mt-2 mb-0 text-muted">
                            <small>
                              {(!excelUploaded && pagination.totalItems <= 1)
                                ? "Hãy upload file danh sách sinh viên trước" 
                                : "Click để chọn file ZIP"}
                            </small>
                          </p>
                        </label>
                      </div>
                    ) : (
                      <div className="border rounded-3 p-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: "#f0f7ff" }}>
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-file-zip text-primary" style={{ fontSize: "24px" }}></i>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: "14px" }}>{zipFileName}</div>
                            <small className="text-muted">{formatFileSize(zipFile.size)}</small>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={removeZipFile}
                          disabled={zipLoading || isPolling}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  {!excelUploaded && pagination.totalItems <= 1 ? (
                    <div title="Hãy upload file danh sách sinh viên trước" style={{ width: "100%" }}>
                      <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={true}
                        style={{ pointerEvents: "none" }}
                      >
                        {zipLoading || isPolling ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            {zipLoading ? "Đang upload..." : "Đang xử lý..."}
                          </>
                        ) : (
                          <>
                            <i className="bi bi-cloud-upload me-2"></i>
                            Upload ZIP
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={zipLoading || isPolling || !zipFile}
                    >
                    {zipLoading || isPolling ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {zipLoading ? "Đang upload..." : "Đang xử lý..."}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload me-2"></i>
                        Upload ZIP
                      </>
                    )}
                    </button>
                  )}
                </form>

                {/* Lịch sử upload */}
                <div className="mt-4 pt-4 border-top">
                  <h6 className="fw-bold mb-3" style={{ color: "#333" }}>
                    <i className="bi bi-clock-history text-primary me-2"></i>
                    Lịch sử upload
                  </h6>

                  {loadingExamZips ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : examZips.length === 0 ? (
                    <div className="text-center py-3">
                      <i className="bi bi-inbox text-muted" style={{ fontSize: "32px" }}></i>
                      <p className="text-muted mt-2 mb-0 small">Chưa có lịch sử upload nào</p>
                    </div>
                  ) : (
                    <div className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
                      {examZips.map((zip) => (
                        <div
                          key={zip.examZipId}
                          className="list-group-item border rounded-3 mb-2 shadow-sm"
                          style={{
                            transition: "all 0.3s",
                            borderWidth: "1px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f8f9fa";
                            e.currentTarget.style.borderColor = "#0d6efd";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#fff";
                            e.currentTarget.style.borderColor = "#dee2e6";
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <i className="bi bi-file-zip text-primary" style={{ fontSize: "18px" }}></i>
                                <span className="fw-semibold small" style={{ color: "#333" }}>
                                  {zip.zipName}
                                </span>
                                <span className={`badge ${
                                  zip.parseStatus === "DONE" ? "bg-success" :
                                  zip.parseStatus === "ERROR" ? "bg-danger" :
                                  zip.parseStatus === "PENDING" ? "bg-warning" : "bg-secondary"
                                }`}>
                                  {zip.parseStatus === "DONE" ? "Hoàn thành" :
                                   zip.parseStatus === "ERROR" ? "Lỗi" :
                                   zip.parseStatus === "PENDING" ? "Đang xử lý" : zip.parseStatus}
                                </span>
                              </div>
                              <div className="mb-2">
                                <small className="text-muted d-flex align-items-center">
                                  <i className="bi bi-calendar3 me-2"></i>
                                  {formatDate(zip.uploadedAt)}
                                </small>
                              </div>
                              {zip.totalCount > 0 ? (
                                <div className="mb-2">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <small className="text-muted">
                                      Đã xử lý: {zip.processedCount} / {zip.totalCount}
                                    </small>
                                    <small className="text-muted">
                                      {Math.round((zip.processedCount / zip.totalCount) * 100)}%
                                    </small>
                                  </div>
                                  <div className="progress" style={{ height: "6px", borderRadius: "10px" }}>
                                    <div
                                      className={`progress-bar ${
                                        zip.parseStatus === "DONE" ? "bg-success" :
                                        zip.parseStatus === "ERROR" ? "bg-danger" : "bg-warning"
                                      }`}
                                      role="progressbar"
                                      style={{ 
                                        width: `${(zip.processedCount / zip.totalCount) * 100}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-2">
                                  <small className="text-muted">
                                    Đã xử lý: {zip.processedCount} / {zip.totalCount || 0}
                                  </small>
                                </div>
                              )}
                              {zip.parseSummary && (
                                <div className="mt-2">
                                  <small className="text-muted d-block" style={{ 
                                    whiteSpace: "pre-wrap",
                                    fontSize: "11px"
                                  }}>
                                    <i className="bi bi-info-circle me-1"></i>
                                    {zip.parseSummary}
                                  </small>
                                </div>
                              )}
                            </div>
                            <div className="ms-3">
                              <small className="text-muted">
                                ID: {zip.examZipId}
                              </small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                  disabled={descriptionLoading || detailsLoading || zipLoading || isPolling}
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

export default ListStudent;

