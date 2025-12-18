"use client";

import { useState } from "react";
import { apiService } from "@/services/api";

interface MessageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  conversationId: string;
  messageContent: string;
}

const REPORT_REASONS = [
  "Spam",
  "Nội dung không phù hợp",
  "Quấy rối",
  "Thông tin sai lệch",
  "Vi phạm bản quyền",
  "Khác",
];

export default function MessageReportModal({
  isOpen,
  onClose,
  messageId,
  conversationId,
  messageContent,
}: MessageReportModalProps) {
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

      await apiService.reportMessage({
        messageId,
        conversationId,
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
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", color: "#111827" }}>
          Báo cáo tin nhắn
        </h2>

        {error && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Message preview */}
        <div style={{ marginBottom: "20px" }}>
          <h3
            style={{ fontSize: "14px", color: "#374151", marginBottom: "8px" }}
          >
            Nội dung tin nhắn bị báo cáo:
          </h3>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#f3f4f6",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "14px",
              color: "#374151",
            }}
          >
            {messageContent}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Reason */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#374151",
                fontWeight: "600",
              }}
            >
              Lý do báo cáo *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: "white",
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
                marginBottom: "8px",
                color: "#374151",
                fontWeight: "600",
              }}
            >
              Mô tả chi tiết *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hãy mô tả chi tiết về vấn đề của tin nhắn này..."
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                minHeight: "100px",
                resize: "vertical",
                backgroundColor: "white",
              }}
              required
            />
          </div>

          {/* Buttons */}
          <div
            style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "12px 24px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor: "white",
                color: "#374151",
                fontWeight: "600",
                cursor: "pointer",
              }}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#dc2626",
                color: "white",
                fontWeight: "600",
                cursor: isSubmitting ? "wait" : "pointer",
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
