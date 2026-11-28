/** Field multipart chứa file logo. */
export const COMPANY_LOGO_FILE_FIELD = 'file';

/** Dung lượng tối đa của logo: 2MB. */
export const COMPANY_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;

/** Thư mục chứa logo trên S3: company/logo/<uuid>.<ext> */
export const COMPANY_LOGO_S3_PREFIX = 'company/logo';

/**
 * Đường dẫn công khai trả về trong `logoUrl`. Endpoint này redirect sang presigned URL
 * nên bucket vẫn private mà URL hiển thị luôn cố định; `?v=` đổi mỗi lần cập nhật để phá cache.
 */
export const COMPANY_LOGO_PUBLIC_PATH = '/api/company/logo';

/** Hiệu lực presigned URL sinh ra mỗi lần redirect (giây): 1 giờ. */
export const COMPANY_LOGO_SIGNED_URL_EXPIRES_SEC = 60 * 60;

/** Trình duyệt được cache response redirect (giây): 5 phút, luôn ngắn hơn hạn presigned URL. */
export const COMPANY_LOGO_REDIRECT_CACHE_SEC = 5 * 60;
