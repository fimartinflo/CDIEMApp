import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
  Alert,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import esLocale from 'date-fns/locale/es';
import patientService from '../services/patientService';

const PatientForm = ({ patient, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    tipoIdentificacion: 'rut',
    rut: '',
    pasaporte: '',
    fechaNacimiento: null,
    prevision: '',
    telefono: '',
    correo: '',
    genero: '',
    generoOtro: '',
    direccion: '',
    estado: 'activo'
  });

  const [errors, setErrors] = useState({});
  const [rutValid, setRutValid] = useState(true);

  // Cargar datos existentes
  useEffect(() => {
    if (patient) {
      setFormData({
        nombreCompleto: patient.nombreCompleto || '',
        tipoIdentificacion: patient.tipoIdentificacion || 'rut',
        rut: patient.rut || '',
        pasaporte: patient.pasaporte || '',
        fechaNacimiento: patient.fechaNacimiento ? new Date(patient.fechaNacimiento) : null,
        prevision: patient.prevision || '',
        telefono: patient.telefono || '',
        correo: patient.correo || '',
        genero: patient.genero || '',
        generoOtro: patient.generoOtro || '',
        direccion: patient.direccion || '',
        estado: patient.estado || 'activo'
      });
    }
  }, [patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si cambia el tipo de identificación, limpiar campos
    if (name === 'tipoIdentificacion') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        rut: value === 'rut' ? prev.rut : '',
        pasaporte: value === 'pasaporte' ? prev.pasaporte : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Validar RUT en tiempo real
    if (name === 'rut' && formData.tipoIdentificacion === 'rut') {
      const isValid = patientService.validateRUT(value);
      setRutValid(isValid || value === '');
      
      if (value && !isValid) {
        setErrors(prev => ({ ...prev, rut: 'RUT inválido' }));
      } else {
        setErrors(prev => ({ ...prev, rut: '' }));
      }
    }

    // Limpiar error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar nombre completo
    if (!formData.nombreCompleto.trim()) {
      newErrors.nombreCompleto = 'Nombre completo es obligatorio';
    }

    // Validar identificación según tipo
    if (formData.tipoIdentificacion === 'rut') {
      if (!formData.rut) {
        newErrors.rut = 'RUT es obligatorio';
      } else if (!patientService.validateRUT(formData.rut)) {
        newErrors.rut = 'RUT chileno inválido';
      }
    } else {
      if (!formData.pasaporte) {
        newErrors.pasaporte = 'Pasaporte es obligatorio';
      } else if (formData.pasaporte.length < 6) {
        newErrors.pasaporte = 'Pasaporte debe tener al menos 6 caracteres';
      }
    }

    // Validar teléfono si existe
    if (formData.telefono && !/^(\+56)?[0-9]{9}$/.test(formData.telefono)) {
      newErrors.telefono = 'Teléfono inválido. Formato: 912345678 o +56912345678';
    }

    // Validar email si existe
    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = 'Correo electrónico inválido';
    }

    // Validar género "otro"
    if (formData.genero === 'otro' && !formData.generoOtro.trim()) {
      newErrors.generoOtro = 'Por favor especifique el género';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Formatear datos para enviar
      const dataToSend = {
        ...formData,
        fechaNacimiento: formData.fechaNacimiento 
          ? formData.fechaNacimiento.toISOString().split('T')[0]
          : null
      };
      
      onSave(dataToSend);
    }
  };

  const calculateAge = () => {
    if (!formData.fechaNacimiento) return null;
    const today = new Date();
    const birthDate = new Date(formData.fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={esLocale}>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {/* Sección: Información básica */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Información Básica
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre Completo *"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              error={!!errors.nombreCompleto}
              helperText={errors.nombreCompleto}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.tipoIdentificacion}>
              <InputLabel>Tipo de Identificación *</InputLabel>
              <Select
                name="tipoIdentificacion"
                value={formData.tipoIdentificacion}
                onChange={handleChange}
                label="Tipo de Identificación *"
              >
                <MenuItem value="rut">RUT (Paciente Chileno)</MenuItem>
                <MenuItem value="pasaporte">Pasaporte (Paciente Extranjero)</MenuItem>
              </Select>
              <FormHelperText>
                {formData.tipoIdentificacion === 'rut' 
                  ? 'Ej: 12.345.678-9' 
                  : 'Documento de identificación extranjero'}
              </FormHelperText>
            </FormControl>
          </Grid>

          {formData.tipoIdentificacion === 'rut' ? (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RUT *"
                name="rut"
                value={formData.rut}
                onChange={handleChange}
                placeholder="12345678-9"
                error={!!errors.rut || !rutValid}
                helperText={
                  errors.rut || 
                  (formData.rut && !rutValid ? 'RUT inválido' : 'Formato: 12.345.678-9')
                }
              />
              {formData.rut && rutValid && (
                <Alert severity="success" sx={{ mt: 1, py: 0 }}>
                  RUT válido: {patientService.formatRUT(formData.rut)}
                </Alert>
              )}
            </Grid>
          ) : (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Pasaporte *"
                name="pasaporte"
                value={formData.pasaporte}
                onChange={handleChange}
                error={!!errors.pasaporte}
                helperText={errors.pasaporte || 'Documento de identificación extranjero'}
              />
            </Grid>
          )}

          {/* Sección: Información personal */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Información Personal
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Fecha de Nacimiento"
              value={formData.fechaNacimiento}
              onChange={(date) => setFormData(prev => ({ ...prev, fechaNacimiento: date }))}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: formData.fechaNacimiento 
                    ? `Edad: ${calculateAge()} años`
                    : 'Opcional'
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Previsión"
              name="prevision"
              value={formData.prevision}
              onChange={handleChange}
              helperText="Ej: FONASA, ISAPRE, Particular"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Teléfono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="912345678"
              error={!!errors.telefono}
              helperText={errors.telefono || 'Formato chileno: 912345678 o +56912345678'}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Correo Electrónico"
              name="correo"
              type="email"
              value={formData.correo}
              onChange={handleChange}
              error={!!errors.correo}
              helperText={errors.correo}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Género</InputLabel>
              <Select
                name="genero"
                value={formData.genero}
                onChange={handleChange}
                label="Género"
              >
                <MenuItem value="">No especificar</MenuItem>
                <MenuItem value="masculino">Masculino</MenuItem>
                <MenuItem value="femenino">Femenino</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {formData.genero === 'otro' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Especifique Género"
                name="generoOtro"
                value={formData.generoOtro}
                onChange={handleChange}
                error={!!errors.generoOtro}
                helperText={errors.generoOtro}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Dirección"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              multiline
              rows={2}
              helperText="Calle, número, ciudad, región"
            />
          </Grid>

          {/* Botones */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
              <Button onClick={onCancel} variant="outlined">
                Cancelar
              </Button>
              <Button type="submit" variant="contained" color="primary">
                {patient ? 'Actualizar' : 'Crear'} Paciente
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default PatientForm;