"use client";

import { useState } from "react";
import { apiService } from "@/services/api";

interface PostReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postContent: string;
  postMedia?: Array<{
    type: "image" | "video";
    sourceUrl: string;
  }>;
}

const REPORT_REASONS = [
  "Spam",
  "Nội dung không phù hợp",
  "Quấy rối",
  "Thông tin sai lệch",
  "Vi phạm bản quyền",
  "Khác",
];

export default function PostReportModal({
  isOpen,
  onClose,
  postId,
  postContent,
  postMedia,
}: PostReportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError("Vui lòng chọn lý do báo cáo");
      return;
    }

    if (!description.trim()) {
      setError("Vui lòng nhập mô tả chi tiết");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      await apiService.reportPost({
        postId,
        reason,
        description,
      });

      alert("Báo cáo đã được gửi thành công!");
      onClose();

      // Reset form
      setReason("");
      setDescription("");
    } catch (error: any) {
      setError(error.message || "Có lỗi xảy ra khi gửi báo cáo");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: "90%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "24px" }}>
          <h2
            style={{
              margin: "0 0 20px 0",
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Báo cáo bài viết
          </h2>

          {error && (
            <div
              style={{
                padding: "12px",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#991b1b",
                marginBottom: "20px",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* Post preview */}
          <div style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: 14,
                color: "#374151",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              Nội dung bài viết bị báo cáo:
            </h3>
            <div
              style={{
                padding: "12px",
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 14,
                color: "#374151",
                maxHeight: "150px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {postContent || "Không có nội dung"}
            </div>

            {/* Show media preview if available */}
            {postMedia && postMedia.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {postMedia.slice(0, 3).map((media, index) => (
                  <div
                    key={index}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      background: "#f3f4f6",
                    }}
                  >
                    {media.type === "image" ? (
                      <img
                        src={media.sourceUrl}
                        alt={`Post media ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <video
                        src={media.sourceUrl}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </div>
                ))}
                {postMedia.length > 3 && (
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    +{postMedia.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Reason */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Lý do báo cáo *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  color: "#111827",
                  background: "#ffffff",
                  outline: "none",
                }}
                required
              >
                <option value="">Chọn lý do...</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Mô tả chi tiết *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hãy mô tả chi tiết về vấn đề của bài viết này..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  color: "#111827",
                  minHeight: "100px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  outline: "none",
                }}
                required
              />
            </div>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#374151",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                disabled={isSubmitting}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "#ffffff";
                  }
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: isSubmitting
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

