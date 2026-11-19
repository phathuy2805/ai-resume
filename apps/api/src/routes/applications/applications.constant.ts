/** Tên field multipart chứa file CV. */
export const CV_FILE_FIELD = 'file';

/** Dung lượng CV tối đa: 5MB. */
export const CV_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const CV_MIME_TYPE = 'application/pdf';

/** Header của mọi file PDF. */
export const PDF_MAGIC = '%PDF';

/**
 * Header %PDF có thể nằm trong 1024 byte đầu, không nhất thiết ở byte 0: một số công cụ xuất
 * file chèn vài byte phía trước (VD: ký tự xuống dòng). Adobe Reader và pdf.js đều chấp nhận.
 */
export const PDF_HEADER_SEARCH_BYTES = 1024;
