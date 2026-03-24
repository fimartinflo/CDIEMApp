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
  Divider,
  Paper,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Badge as BadgeIcon,
  ContactPhone as ContactIcon,
  LocalHospital as MedicalIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import esLocale from 'date-fns/locale/es';
import patientService from '../services/patientService';

const SectionHeader = ({ icon, title }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 1 }}>
    <Box sx={{ color: 'primary.main' }}>{icon}</Box>
    <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
      {title}
    </Typography>
  </Box>
);

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

    if (name === 'rut' && formData.tipoIdentificacion === 'rut') {
      const isValid = patientService.validateRUT(value);
      setRutValid(isValid || value === '');
      setErrors(prev => ({ ...prev, rut: value && !isValid ? 'RUT inválido' : '' }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombreCompleto.trim()) {
      newErrors.nombreCompleto = 'Nombre completo es obligatorio';
    }
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
    if (formData.telefono && !/^(\+56)?[0-9]{9}$/.test(formData.telefono)) {
      newErrors.telefono = 'Formato: 912345678 o +56912345678';
    }
    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = 'Correo electrónico inválido';
    }
    if (formData.genero === 'otro' && !formData.generoOtro.trim()) {
      newErrors.generoOtro = 'Por favor especifique el género';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        ...formData,
        fechaNacimiento: formData.fechaNacimiento
          ? formData.fechaNacimiento.toISOString().split('T')[0]
          : null
      });
    }
  };

  const calculateAge = () => {
    if (!formData.fechaNacimiento) return null;
    const today = new Date();
    const birth = new Date(formData.fechaNacimiento);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const estadoColors = { activo: 'success', inactivo: 'error', en_tratamiento: 'warning' };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={esLocale}>
      <Box component="form" onSubmit={handleSubmit}>

        {/* ── Estado (solo en edición) ── */}
        {patient && (
          <Paper
            variant="outlined"
            sx={{
              p: 2, mb: 3,
              borderColor: estadoColors[formData.estado] === 'success' ? '#2e7d32' :
                           estadoColors[formData.estado] === 'error' ? '#d32f2f' : '#ed6c02',
              bgcolor: estadoColors[formData.estado] === 'success' ? '#f0faf0' :
                       estadoColors[formData.estado] === 'error' ? '#fdf0f0' : '#fff8f0'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Estado actual del paciente
                </Typography>
                <Chip
                  label={formData.estado.replace('_', ' ')}
                  color={estadoColors[formData.estado]}
                  size="medium"
                />
              </Box>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Cambiar estado</InputLabel>
                <Select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  label="Cambiar estado"
                >
                  <MenuItem value="activo">Activo</MenuItem>
                  <MenuItem value="inactivo">Inactivo</MenuItem>
                  <MenuItem value="en_tratamiento">En Tratamiento</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        )}

        {/* ── Sección: Identificación ── */}
        <SectionHeader icon={<BadgeIcon />} title="Identificación" />
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
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

          <Grid item xs={12} sm={5}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Identificación *</InputLabel>
              <Select
                name="tipoIdentificacion"
                value={formData.tipoIdentificacion}
                onChange={handleChange}
                label="Tipo de Identificación *"
              >
                <MenuItem value="rut">RUT (Chileno)</MenuItem>
                <MenuItem value="pasaporte">Pasaporte (Extranjero)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={7}>
            {formData.tipoIdentificacion === 'rut' ? (
              <>
                <TextField
                  fullWidth
                  label="RUT *"
                  name="rut"
                  value={formData.rut}
                  onChange={handleChange}
                  placeholder="12345678-9"
                  error={!!errors.rut || !rutValid}
                  helperText={errors.rut || (formData.rut && !rutValid ? 'RUT inválido' : 'Formato: 12.345.678-9')}
                />
                {formData.rut && rutValid && (
                  <Alert severity="success" sx={{ mt: 0.5, py: 0 }}>
                    RUT válido: {patientService.formatRUT(formData.rut)}
                  </Alert>
                )}
              </>
            ) : (
              <TextField
                fullWidth
                label="Pasaporte *"
                name="pasaporte"
                value={formData.pasaporte}
                onChange={handleChange}
                error={!!errors.pasaporte}
                helperText={errors.pasaporte || 'Documento de identificación extranjero'}
              />
            )}
          </Grid>
        </Grid>

        {/* ── Sección: Datos Personales ── */}
        <SectionHeader icon={<PersonIcon />} title="Datos Personales" />
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
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
            <FormControl fullWidth>
              <InputLabel>Género</InputLabel>
              <Select name="genero" value={formData.genero} onChange={handleChange} label="Género">
                <MenuItem value="">No especificar</MenuItem>
                <MenuItem value="masculino">Masculino</MenuItem>
                <MenuItem value="femenino">Femenino</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
            {formData.genero === 'otro' && (
              <TextField
                fullWidth
                label="Especifique Género"
                name="generoOtro"
                value={formData.generoOtro}
                onChange={handleChange}
                error={!!errors.generoOtro}
                helperText={errors.generoOtro}
                sx={{ mt: 1 }}
              />
            )}
          </Grid>

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
        </Grid>

        {/* ── Sección: Contacto y Previsión ── */}
        <SectionHeader icon={<ContactIcon />} title="Contacto y Previsión" />
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Teléfono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="912345678"
              error={!!errors.telefono}
              helperText={errors.telefono || 'Ej: 912345678'}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
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

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Previsión"
              name="prevision"
              value={formData.prevision}
              onChange={handleChange}
              helperText="FONASA, ISAPRE, Particular..."
            />
          </Grid>
        </Grid>

        {/* ── Sección: Clínica (solo creación) ── */}
        {!patient && (
          <>
            <SectionHeader icon={<MedicalIcon />} title="Información Clínica" />
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado Inicial</InputLabel>
                  <Select name="estado" value={formData.estado} onChange={handleChange} label="Estado Inicial">
                    <MenuItem value="activo">Activo</MenuItem>
                    <MenuItem value="inactivo">Inactivo</MenuItem>
                  </Select>
                  <FormHelperText>
                    Normalmente se crea como "Activo"
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </>
        )}

        {/* ── Botones ── */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1 }}>
          <Button onClick={onCancel} variant="outlined">Cancelar</Button>
          <Button type="submit" variant="contained" color="primary">
            {patient ? 'Guardar Cambios' : 'Crear Paciente'}
          </Button>
        </Box>

      </Box>
    </LocalizationProvider>
  );
};

export default PatientForm;
