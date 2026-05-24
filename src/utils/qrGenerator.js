import QRCode from 'qrcode';

/**
 * Generate QR code PNG buffer dari content string
 * @param {string} content - Isi QR code (token statis)
 * @returns {Promise<Buffer>} PNG buffer
 */
export const generateQRBuffer = async (content) => {
  return QRCode.toBuffer(content, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
};

/**
 * Generate QR code sebagai Data URL (base64)
 * @param {string} content
 * @returns {Promise<string>} Data URL
 */
export const generateQRDataURL = async (content) => {
  return QRCode.toDataURL(content, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
  });
};
