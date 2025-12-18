"use client";

import { useState, useEffect } from "react";
import { apiService, MessageReport, PostReport } from "@/services/api";

type Report = MessageReport | PostReport;

interface ReportsManagementProps {
  type: "message" | "post";
}

export default function ReportsManagement({ type }: ReportsManagementProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load reports
  useEffect(() => {
    console.log("[ReportsManagement] useEffect triggered:", {
      type,
      filterStatus,
    });
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, filterStatus]);

  const loadReports = async (statusFilter?: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log("[ReportsManagement] Loading reports:", {
        type,
        statusFilter: statusFilter || filterStatus,
      });

      if (type === "message") {
        const response = await apiService.getMessageReports(
          statusFilter || filterStatus
        );
        console.log(
          "[ReportsManagement] Reports loaded:",
          response.data?.length || 0,
          "reports"
        );

        if (response.success) {
          setReports(response.data || []);
        } else {
          console.error("[ReportsManagement] API returned success=false");
          setError("Không thể tải danh sách báo cáo");
        }
      } else if (type === "post") {
        const response = await apiService.getPostReports(
          statusFilter || filterStatus
        );
        console.log(
          "[ReportsManagement] Post reports loaded:",
          response.data?.length || 0,
          "reports"
        );

        if (response.success) {
          setReports(response.data || []);
        } else {
          console.error("[ReportsManagement] API returned success=false");
          setError("Không thể tải danh sách báo cáo");
        }
      } else {
        setReports([]);
      }
    } catch (error: any) {
      console.error("[ReportsManagement] Error loading reports:", error);
      setError(error.message || "Lỗi khi tải báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reportId: string) => {
    if (!confirm("Bạn có chắc muốn xóa nội dung vi phạm?")) return;

    try {
      if (type === "message") {
        console.log("[ReportsManagement] Approving message report:", reportId);
        await apiService.updateMessageReportStatus(reportId, "approved");
        console.log("[ReportsManagement] Message report approved successfully");

        // Reload reports to reflect changes
        await loadReports(filterStatus);

        alert("Đã xóa nội dung vi phạm");
        setSelectedReport(null);
      } else if (type === "post") {
        console.log("[ReportsManagement] Approving post report:", reportId);
        await apiService.updatePostReportStatus(reportId, "approved");
        console.log("[ReportsManagement] Post report approved successfully");

        // Reload reports to reflect changes
        await loadReports(filterStatus);

        alert("Đã xóa bài viết vi phạm");
        setSelectedReport(null);
      }
    } catch (error: any) {
      console.error("[ReportsManagement] Error approving report:", error);
      alert("Lỗi: " + (error.message || "Không thể xóa nội dung vi phạm"));
    }
  };

  const handleReject = async (reportId: string) => {
    if (!confirm("Bạn có chắc muốn từ chối báo cáo này?")) return;

    try {
      if (type === "message") {
        console.log("[ReportsManagement] Rejecting message report:", reportId);
        await apiService.updateMessageReportStatus(reportId, "rejected");
        console.log("[ReportsManagement] Message report rejected successfully");

        // Reload reports to reflect changes
        await loadReports(filterStatus);

        alert("Đã từ chối báo cáo");
        setSelectedReport(null);
      } else if (type === "post") {
        console.log("[ReportsManagement] Rejecting post report:", reportId);
        await apiService.updatePostReportStatus(reportId, "rejected");
        console.log("[ReportsManagement] Post report rejected successfully");

        // Reload reports to reflect changes
        await loadReports(filterStatus);

        alert("Đã từ chối báo cáo");
        setSelectedReport(null);
      }
    } catch (error: any) {
      console.error("[ReportsManagement] Error rejecting report:", error);
      alert("Lỗi: " + (error.message || "Không thể từ chối báo cáo"));
    }
  };

  const filteredReports = reports.filter((r) =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  // Handle filter change
  const handleFilterChange = (newFilter: string) => {
    console.log("[ReportsManagement] Filter changed:", newFilter);
    setFilterStatus(newFilter as "all" | "pending" | "approved" | "rejected");
    // loadReports will be called by useEffect due to filterStatus change
  };

  const getStatusBadge = (status: Report["status"]) => {
    const styles = {
      pending: { backgroundColor: "#fef3c7", color: "#92400e" },
      approved: { backgroundColor: "#d1fae5", color: "#065f46" },
      rejected: { backgroundColor: "#fee2e2", color: "#991b1b" },
    };
    const labels = {
      pending: "Chờ xử lý",
      approved: "Đã duyệt",
      rejected: "Đã từ chối",
    };
    return (
      <span
        style={{
          padding: "4px 12px",
          fontSize: "12px",
          fontWeight: "600",
          borderRadius: "12px",
          ...styles[status],
        }}
      >
        {labels[status]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ marginBottom: "16px" }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: "spin 1s linear infinite" }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
          <p>Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "#dc2626" }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginBottom: "16px" }}
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p>Lỗi: {error}</p>
          <button
            onClick={() => loadReports(filterStatus)}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Reports List */}
      <div
        style={{
          width: "40%",
          borderRight: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            padding: "20px",
            zIndex: 10,
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "16px",
            }}
          >
            {type === "message" ? "📬 Báo cáo Tin nhắn" : "📝 Báo cáo Bài viết"}
          </h1>

          {/* Filter */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { value: "all", label: `Tất cả (${reports.length})` },
              {
                value: "pending",
                label: `Chờ xử lý (${
                  reports.filter((r) => r.status === "pending").length
                })`,
              },
              {
                value: "approved",
                label: `Đã duyệt (${
                  reports.filter((r) => r.status === "approved").length
                })`,
              },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor:
                    filterStatus === filter.value ? "#2563eb" : "#f3f4f6",
                  color: filterStatus === filter.value ? "#ffffff" : "#374151",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (filterStatus !== filter.value) {
                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterStatus !== filter.value) {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        <div>
          {filteredReports.length === 0 ? (
            <div
              style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}
            >
              <p>Không có báo cáo nào</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                style={{
                  padding: "16px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f3f4f6",
                  backgroundColor:
                    selectedReport?.id === report.id ? "#eff6ff" : "#ffffff",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (selectedReport?.id !== report.id) {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedReport?.id !== report.id) {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                    >
                      {report.reportedBy.name.charAt(0)}
                    </div>
                    <div>
                      <p
                        style={{
                          fontWeight: "600",
                          fontSize: "14px",
                          color: "#111827",
                          margin: 0,
                        }}
                      >
                        {report.reportedBy.name}
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          margin: 0,
                        }}
                      >
                        báo cáo {report.reportedUser.name}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(report.status)}
                </div>

                <p
                  style={{
                    fontSize: "14px",
                    color: "#111827",
                    fontWeight: "600",
                    marginBottom: "4px",
                  }}
                >
                  {report.reason}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    marginBottom: "8px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {report.description}
                </p>
                <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                  {formatDate(report.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Report Detail */}
      <div style={{ flex: 1, backgroundColor: "#f9fafb", overflowY: "auto" }}>
        {selectedReport ? (
          <div style={{ padding: "24px" }}>
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Chi tiết báo cáo
                </h2>
                {getStatusBadge(selectedReport.status)}
              </div>

              {/* Reported By */}
              <div style={{ marginBottom: "20px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "12px",
                  }}
                >
                  Người báo cáo
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "18px",
                      fontWeight: "bold",
                    }}
                  >
                    {selectedReport.reportedBy.name.charAt(0)}
                  </div>
                  <div>
                    <p
                      style={{ fontWeight: "600", color: "#111827", margin: 0 }}
                    >
                      {selectedReport.reportedBy.name}
                    </p>
                    <p
                      style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}
                    >
                      {selectedReport.reportedBy.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reported User */}
              <div style={{ marginBottom: "20px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "12px",
                  }}
                >
                  Người bị báo cáo
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      background:
                        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "18px",
                      fontWeight: "bold",
                    }}
                  >
                    {selectedReport.reportedUser.name.charAt(0)}
                  </div>
                  <div>
                    <p
                      style={{ fontWeight: "600", color: "#111827", margin: 0 }}
                    >
                      {selectedReport.reportedUser.name}
                    </p>
                    <p
                      style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}
                    >
                      {selectedReport.reportedUser.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div style={{ marginBottom: "20px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Lý do báo cáo
                </h3>
                <p style={{ color: "#dc2626", fontWeight: "600", margin: 0 }}>
                  {selectedReport.reason}
                </p>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "20px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Mô tả chi tiết
                </h3>
                <p style={{ color: "#374151", margin: 0, lineHeight: 1.6 }}>
                  {selectedReport.description}
                </p>
              </div>

              {/* Content */}
              {selectedReport.content && (
                <div style={{ marginBottom: "20px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Nội dung {type === "message" ? "tin nhắn" : "bài viết"}
                  </h3>
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p style={{ color: "#111827", margin: 0 }}>
                      {selectedReport.content}
                    </p>
                  </div>
                </div>
              )}

              {/* Time */}
              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Thời gian báo cáo
                </h3>
                <p style={{ color: "#6b7280", margin: 0 }}>
                  {formatDate(selectedReport.createdAt)}
                </p>
              </div>

              {/* Actions */}
              {selectedReport.status === "pending" && (
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => handleApprove(selectedReport.id)}
                    style={{
                      flex: 1,
                      padding: "14px 24px",
                      backgroundColor: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "15px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#b91c1c")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#dc2626")
                    }
                  >
                    ❌ Xóa nội dung vi phạm
                  </button>
                  <button
                    onClick={() => handleReject(selectedReport.id)}
                    style={{
                      flex: 1,
                      padding: "14px 24px",
                      backgroundColor: "#e5e7eb",
                      color: "#374151",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "15px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#d1d5db")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#e5e7eb")
                    }
                  >
                    Từ chối báo cáo
                  </button>
                </div>
              )}

              {selectedReport.status === "approved" && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#d1fae5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ color: "#065f46", fontWeight: "600", margin: 0 }}>
                    ✓ Đã xóa nội dung vi phạm
                  </p>
                </div>
              )}

              {selectedReport.status === "rejected" && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ color: "#6b7280", margin: 0 }}>
                    Báo cáo đã bị từ chối
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <div style={{ textAlign: "center", color: "#9ca3af" }}>
              <svg
                style={{
                  width: "64px",
                  height: "64px",
                  margin: "0 auto 16px",
                  color: "#d1d5db",
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p style={{ fontSize: "15px" }}>
                Chọn một báo cáo để xem chi tiết
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
