/**
 * utils/response.js — Helpers de respuesta HTTP estandarizada
 *
 * Garantiza un formato consistente en todas las respuestas de la API:
 *   { success: true/false, message: string, data?: any, code?: string }
 *
 * CRÍTICO: el orden de parámetros es (res, message, data, status).
 * Pasar datos en el segundo argumento es un error frecuente — siempre va el mensaje.
 *
 * Ejemplo correcto:   success(res, 'Paciente creado', { id: 1 })
 * Ejemplo incorrecto: success(res, { id: 1 }, 'Paciente creado')  ← datos en message
 */

/**
 * Envía una respuesta exitosa.
 *
 * @param {object} res       - Objeto Response de Express
 * @param {string} message   - Mensaje descriptivo (ej. 'Paciente creado exitosamente')
 * @param {*}      [data]    - Payload a retornar (null si no aplica)
 * @param {number} [status]  - Código HTTP (default 200)
 */
function success(res, message, data = null, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data
  });
}

/**
 * Envía una respuesta de error.
 *
 * @param {object} res       - Objeto Response de Express
 * @param {string} message   - Mensaje de error legible para el usuario
 * @param {string} code      - Código interno del error (ej. 'PATIENT_NOT_FOUND')
 * @param {number} [status]  - Código HTTP (default 400)
 */
function error(res, message, code, status = 400) {
  return res.status(status).json({
    success: false,
    message,
    code
  });
}

module.exports = { success, error };
