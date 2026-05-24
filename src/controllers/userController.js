import * as userService from '../services/userService.js'
import { sendSuccess, sendError } from '../utils/response.js'

export const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id)
    sendSuccess(res, 'Profil berhasil diambil.', { user })
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode)
    next(err)
  }
}

export const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body)
    sendSuccess(res, 'Profil berhasil diperbarui.', { user })
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode)
    next(err)
  }
}

export const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'File foto tidak ditemukan.', 400)
    // req.file.buffer tersedia karena menggunakan memoryStorage
    const result = await userService.updateProfilePhoto(
      req.user.id,
      req.file.buffer,
      req.file.mimetype
    )
    sendSuccess(res, 'Foto profil berhasil diperbarui.', result)
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode)
    next(err)
  }
}

export const changePassword = async (req, res, next) => {
  try {
    await userService.changePassword(req.user.id, req.body)
    sendSuccess(res, 'Password berhasil diubah.')
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode)
    next(err)
  }
}
