export const SLIP_DELETED_ATTACHMENT_MESSAGE =
  "This slip has been deleted. Attachments can't be added to it."

/**
 * Turn raw backend upload errors into a message users can act on. Laravel's
 * `findOrFail` on a soft-deleted slip leaks "No query results for model
 * [App\Models\Slip] 1146"; anything else passes through unchanged.
 */
export function friendlySlipAttachmentError(message: string): string {
  if (/No query results for model \[App\\Models\\Slip\]/i.test(message)) {
    return SLIP_DELETED_ATTACHMENT_MESSAGE
  }
  return message
}
