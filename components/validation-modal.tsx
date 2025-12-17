"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle, Info, CheckCircle } from 'lucide-react';
import { ValidationResult } from '@/lib/validation-rules';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: ValidationResult | null;
  onConfirm?: () => void;
  onCancel?: () => void;
  onSuggestedAction?: () => void;
  suggestedActionLabel?: string;
}

const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  validationResult,
  onConfirm,
  onCancel,
  onSuggestedAction,
  suggestedActionLabel
}) => {
  if (!validationResult || validationResult.isValid) {
    return null;
  }

  const getIcon = () => {
    switch (validationResult.errorType) {
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      case 'info':
        return <Info className="h-8 w-8 text-blue-500" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-gray-500" />;
    }
  };

  const getBadgeVariant = () => {
    switch (validationResult.errorType) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getBadgeColor = () => {
    switch (validationResult.errorType) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionButtons = () => {
    if (validationResult.errorType === 'error') {
      return (
        <div className="flex gap-2 justify-end">
          {/* Use suggestedAction from validationResult if available, otherwise fallback to props */}
          {(validationResult.suggestedAction || (onSuggestedAction && suggestedActionLabel)) && (
            <Button
              variant="default"
              onClick={onSuggestedAction}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {validationResult.suggestedAction?.label || suggestedActionLabel}
            </Button>
          )}
          <Button variant="outline" onClick={onCancel || onClose}>
            Cancel
          </Button>
        </div>
      );
    } else if (validationResult.errorType === 'warning') {
      return (
        <div className="flex gap-2 justify-end">
          {/* Show suggested action for warnings if available */}
          {validationResult.suggestedAction && (
            <Button
              variant="outline"
              onClick={onSuggestedAction}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              {validationResult.suggestedAction.label}
            </Button>
          )}
          <Button variant="outline" onClick={onCancel || onClose}>
            Cancel
          </Button>
          {validationResult.canProceed !== false && (
            <Button
              variant="default"
              onClick={onConfirm || onClose}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Proceed Anyway
            </Button>
          )}
        </div>
      );
    } else {
      // Info type
      return (
        <div className="flex gap-2 justify-end">
          {validationResult.suggestedAction && (
            <Button
              variant="outline"
              onClick={onSuggestedAction}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              {validationResult.suggestedAction.label}
            </Button>
          )}
          <Button variant="default" onClick={onConfirm || onClose}>
            {validationResult.suggestedAction ? 'Continue' : 'OK'}
          </Button>
        </div>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <DialogTitle className="text-xl font-semibold text-center">
            {validationResult.title || 'Validation Issue'}
          </DialogTitle>
          <div className="flex justify-center mt-2">
            <Badge className={getBadgeColor()}>
              {validationResult.errorType?.toUpperCase() || 'ISSUE'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-center text-gray-700 mb-4">
            {validationResult.message}
          </p>

          {validationResult.affectedTeeth && validationResult.affectedTeeth.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Affected Teeth:</p>
              <div className="flex flex-wrap gap-1">
                {validationResult.affectedTeeth.map(tooth => (
                  <Badge key={tooth} variant="outline" className="text-xs">
                    #{tooth}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {validationResult.solution && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-1">Suggested Solution:</p>
              <p className="text-sm text-blue-700">{validationResult.solution}</p>
            </div>
          )}

          {validationResult.suggestedAction && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800 mb-1">Quick Fix Available:</p>
              <p className="text-sm text-green-700">
                Click "{validationResult.suggestedAction.label}" to automatically resolve this issue.
                {validationResult.suggestedAction.targetStatus &&
                  ` This will change the status to "${validationResult.suggestedAction.targetStatus}".`}
                {validationResult.suggestedAction.targetProduct &&
                  ` This will switch to "${validationResult.suggestedAction.targetProduct}".`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {getActionButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationModal;