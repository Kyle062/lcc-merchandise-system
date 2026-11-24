import React from "react";
import { CheckCircle2, Printer, X } from "lucide-react";
import logo from "../../assets/images/LCClogo1.png";
import "./RefundReceipt.css";

export interface RefundReceiptData {
  id: number;
  group_id: number;
  group_code?: string;
  student_name?: string;
  reason: string;
  amount: number;
  status: string;
  refunded_at: string;
  reviewed_at?: string | null;
  reviewed_by_name?: string | null;
  admin_name?: string | null;
}

interface Props {
  refund: RefundReceiptData;
  onClose: () => void;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const RefundReceipt = ({ refund, onClose }: Props) => {
  const groupCode =
    refund.group_code || `#GRP-${String(refund.group_id).padStart(3, "0")}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="refund-receipt-card"
        role="dialog"
        aria-modal="true"
        aria-label="Refund receipt"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="refund-receipt-print">
          <div className="refund-receipt-header">
            <img src={logo} alt="LCC Logo" className="refund-receipt-logo" />
            <div>
              <h2>LEGACY COLLEGE OF COMPOSTELA</h2>
              <p>Merchandise System — Refund Receipt</p>
            </div>
          </div>

          <div className="refund-success-banner">
            <CheckCircle2 size={22} />
            <div>
              <strong>REFUND SUCCESSFUL</strong>
              <span>The refund has been approved and recorded.</span>
            </div>
          </div>

          <div className="refund-receipt-title">REFUND DETAILS</div>

          <div className="refund-receipt-rows">
            <div className="refund-receipt-row">
              <span>Reference No.</span>
              <strong>RF-{String(refund.id).padStart(5, "0")}</strong>
            </div>
            <div className="refund-receipt-row">
              <span>Order</span>
              <strong>{groupCode}</strong>
            </div>
            <div className="refund-receipt-row">
              <span>Student</span>
              <strong>{refund.student_name || "—"}</strong>
            </div>
            <div className="refund-receipt-row">
              <span>Reason</span>
              <strong>{refund.reason}</strong>
            </div>
            <div className="refund-receipt-row">
              <span>Date Refunded</span>
              <strong>{formatDateTime(refund.refunded_at)}</strong>
            </div>
            <div className="refund-receipt-row">
              <span>Approved By</span>
              <strong>
                {refund.reviewed_by_name || refund.admin_name || "LCC Staff"}
              </strong>
            </div>
          </div>

          <div className="refund-receipt-amount">
            <span>AMOUNT REFUNDED</span>
            <strong>₱{Number(refund.amount).toLocaleString()}</strong>
          </div>

          <p className="refund-receipt-note">
            Stock has been restored and the order is now marked as Refunded.
            Please present this receipt at the LCC Cashier if needed.
          </p>
        </div>

        <div className="refund-receipt-actions">
          <button className="btn-print" onClick={() => window.print()}>
            <Printer size={16} /> Print Receipt
          </button>
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundReceipt;
