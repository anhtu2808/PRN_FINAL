import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../Service/AxiosSetup";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const PointList = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [size] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentItems: 0,
  });
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const params = {
          Page: page,
          Size: size,
        };
        
        if (searchTerm.trim()) {
          params.Search = searchTerm.trim();
        }

        const res = await axiosInstance.get("/exams", {
          params,
        });
        
        if (res.data && res.data.data && res.data.data.result) {
          setExercises(res.data.data.result);
          setPagination({
            totalItems: res.data.data.totalItems || 0,
            totalPages: res.data.data.totalPages || 1,
            currentItems: res.data.data.currentItems || 0,
          });
        } else {
          setExercises([]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Lỗi fetch danh sách bài:", err);
        setError("Không thể tải danh sách bài.");
        setLoading(false);
      }
    };

    fetchExercises();
  }, [page, size, searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1); // Reset về trang 1 khi search
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

  const handleSelectExercise = (exerciseId) => {
    navigate(`/list-student?examId=${exerciseId}&status=PARSED`);
  };

  const handleDeleteExam = async (examId, e) => {
    e.stopPropagation(); // Ngăn event bubble lên card
    
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài thi này không?")) {
      return;
    }

    try {
      setDeletingId(examId);
      await axiosInstance.delete(`/exams/${examId}`);
      
      // Refresh danh sách sau khi xóa thành công
      const params = {
        Page: page,
        Size: size,
      };
      
      if (searchTerm.trim()) {
        params.Search = searchTerm.trim();
      }

      const res = await axiosInstance.get("/exams", {
        params,
      });
      
      if (res.data && res.data.data && res.data.data.result) {
        setExercises(res.data.data.result);
        setPagination({
          totalItems: res.data.data.totalItems || 0,
          totalPages: res.data.data.totalPages || 1,
          currentItems: res.data.data.currentItems || 0,
        });
      } else {
        setExercises([]);
      }
      
      setDeletingId(null);
    } catch (err) {
      console.error("Lỗi xóa bài thi:", err);
      alert(err.response?.data?.message || "Không thể xóa bài thi. Vui lòng thử lại.");
      setDeletingId(null);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex flex-column p-0 bg-light">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center p-4 shadow-sm bg-white border-bottom">
        <div className="d-flex align-items-center gap-3">
          <h4 className="mb-0 fw-bold" style={{ color: "#333" }}>
            Danh sách bài chấm điểm
          </h4>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-muted">
            <small>Tổng số: {pagination.totalItems} bài</small>
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
            onClick={() => navigate("/point-turn")}
            style={{
              borderRadius: "10px",
              padding: "8px 20px",
              fontWeight: "600",
            }}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Tạo lượt chấm mới
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
              placeholder="Tìm kiếm theo mã bài, tiêu đề hoặc mô tả..."
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
            <p className="text-muted">Đang tải danh sách bài...</p>
          </div>
        ) : error ? (
          <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "400px" }}>
            <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: "48px" }}></i>
            <p className="text-danger mt-3">{error}</p>
          </div>
        ) : exercises.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "400px" }}>
            <i className="bi bi-inbox text-muted" style={{ fontSize: "48px" }}></i>
            <p className="text-muted mt-3">Chưa có bài nào cần chấm</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="row g-3">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="col-lg-4 col-md-6 col-sm-12">
                <div
                  className="card h-100 shadow-sm border"
                  style={{
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                  }}
                  onClick={() => handleSelectExercise(exercise.id)}
                >
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="flex-grow-1">
                        <h5 className="card-title fw-bold mb-1" style={{ color: "#333" }}>
                          <i className="bi bi-file-text text-primary me-2"></i>
                          {exercise.examCode || `Bài ${exercise.id}`}
                        </h5>
                        {exercise.title && (
                          <p className="text-muted mb-0 small fw-semibold">{exercise.title}</p>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={(e) => handleDeleteExam(exercise.id, e)}
                        disabled={deletingId === exercise.id}
                        style={{
                          borderRadius: "8px",
                          padding: "4px 8px",
                        }}
                        title="Xóa bài thi"
                      >
                        {deletingId === exercise.id ? (
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: "14px", height: "14px" }}>
                            <span className="visually-hidden">Loading...</span>
                          </span>
                        ) : (
                          <i className="bi bi-trash"></i>
                        )}
                      </button>
                    </div>

                    {exercise.description && (
                      <p className="card-text text-muted small mb-3" style={{ 
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        lineHeight: "1.5"
                      }}>
                        {exercise.description}
                      </p>
                    )}

                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        ID: {exercise.id}
                      </small>
                      <i className="bi bi-chevron-right text-primary"></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="list-group">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="list-group-item list-group-item-action border rounded-3 mb-2 shadow-sm"
                style={{
                  cursor: "pointer",
                  transition: "all 0.3s",
                  borderWidth: "1px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                  e.currentTarget.style.borderColor = "#0d6efd";
                  e.currentTarget.style.transform = "translateX(5px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff";
                  e.currentTarget.style.borderColor = "#dee2e6";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
                onClick={() => handleSelectExercise(exercise.id)}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <i className="bi bi-file-text text-primary" style={{ fontSize: "24px" }}></i>
                      <div className="flex-grow-1">
                        <h5 className="mb-1 fw-bold" style={{ color: "#333" }}>
                          {exercise.examCode || `Bài ${exercise.id}`}
                        </h5>
                        {exercise.title && (
                          <p className="mb-0 text-muted fw-semibold">{exercise.title}</p>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={(e) => handleDeleteExam(exercise.id, e)}
                        disabled={deletingId === exercise.id}
                        style={{
                          borderRadius: "8px",
                          padding: "4px 8px",
                        }}
                        title="Xóa bài thi"
                      >
                        {deletingId === exercise.id ? (
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: "14px", height: "14px" }}>
                            <span className="visually-hidden">Loading...</span>
                          </span>
                        ) : (
                          <i className="bi bi-trash"></i>
                        )}
                      </button>
                    </div>
                    {exercise.description && (
                      <p className="text-muted small mb-0 ms-5" style={{ lineHeight: "1.6" }}>
                        {exercise.description}
                      </p>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <small className="text-muted">ID: {exercise.id}</small>
                    <i className="bi bi-chevron-right text-primary" style={{ fontSize: "20px" }}></i>
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
        {!loading && !error && exercises.length > 0 && (
          <div className="text-center mt-3">
            <small className="text-muted">
              Hiển thị {((page - 1) * size) + 1} - {Math.min(page * size, pagination.totalItems)} trong tổng số {pagination.totalItems} bài
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default PointList;

