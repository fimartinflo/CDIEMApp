import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  LockReset as LockResetIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from '@mui/icons-material';
import api from '../services/api';

const ROLES = [
  { value: 'admin',          label: 'Administrador' },
  { value: 'enfermera',      label: 'Enfermera' },
  { value: 'administracion', label: 'Administración' },
];

const roleColor = { admin: 'error', enfermera: 'primary', administracion: 'success' };

const emptyForm = { username: '', password: '', email: '', fullName: '', role: 'enfermera' };

export default function Users() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [snackbar, setSnackbar]   = useState({ open: false, message: '', severity: 'success' });

  // Create dialog
  const [createOpen, setCreateOpen]   = useState(false);
  const [createForm, setCreateForm]   = useState(emptyForm);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen]   = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [editForm, setEditForm]   = useState({ fullName: '', email: '', role: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Reset password dialog
  const [resetOpen, setResetOpen]     = useState(false);
  const [resetUser, setResetUser]     = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data || []);
    } catch {
      showSnack('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── CREATE ────────────────────────────────────────────────────────────────
  const handleCreateSubmit = async () => {
    const { username, password, email, fullName, role } = createForm;
    if (!username || !password || !email || !fullName || !role) {
      showSnack('Todos los campos son obligatorios', 'warning');
      return;
    }
    setCreateLoading(true);
    try {
      await api.post('/auth/users', createForm);
      showSnack('Usuario creado exitosamente');
      setCreateOpen(false);
      setCreateForm(emptyForm);
      loadUsers();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al crear usuario', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── EDIT ──────────────────────────────────────────────────────────────────
  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ fullName: user.fullName, email: user.email, role: user.role });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    setEditLoading(true);
    try {
      await api.put(`/auth/users/${editUser.id}`, editForm);
      showSnack('Usuario actualizado');
      setEditOpen(false);
      loadUsers();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al actualizar usuario', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────
  const handleToggle = async (user) => {
    try {
      await api.put(`/auth/users/${user.id}/toggle-active`);
      showSnack(`Usuario ${user.isActive ? 'desactivado' : 'activado'}`);
      loadUsers();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al cambiar estado', 'error');
    }
  };

  // ── RESET PASSWORD ────────────────────────────────────────────────────────
  const openReset = (user) => {
    setResetUser(user);
    setNewPassword('');
    setResetOpen(true);
  };

  const handleResetSubmit = async () => {
    if (!newPassword || newPassword.length < 6) {
      showSnack('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }
    setResetLoading(true);
    try {
      await api.put(`/auth/users/${resetUser.id}/reset-password`, { newPassword });
      showSnack('Contraseña reseteada exitosamente');
      setResetOpen(false);
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al resetear contraseña', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestión de Usuarios</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Nuevo Usuario
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre completo</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROLES.find(r => r.value === u.role)?.label || u.role}
                      color={roleColor[u.role] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.isActive ? 'Activo' : 'Inactivo'}
                      color={u.isActive ? 'success' : 'default'}
                      size="small"
                      variant={u.isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={u.isActive ? 'Desactivar' : 'Activar'}>
                      <IconButton size="small" onClick={() => handleToggle(u)} color={u.isActive ? 'warning' : 'success'}>
                        {u.isActive ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Resetear contraseña">
                      <IconButton size="small" onClick={() => openReset(u)} color="secondary">
                        <LockResetIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Dialog: Crear usuario ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Usuario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Nombre completo"
            value={createForm.fullName}
            onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Nombre de usuario"
            value={createForm.username}
            onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={createForm.email}
            onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Contraseña"
            type="password"
            value={createForm.password}
            onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select
              value={createForm.role}
              label="Rol"
              onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateSubmit} disabled={createLoading}>
            {createLoading ? <CircularProgress size={20} /> : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Editar usuario ── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Usuario — {editUser?.username}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Nombre completo"
            value={editForm.fullName}
            onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select
              value={editForm.role}
              label="Rol"
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={editLoading}>
            {editLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Resetear contraseña ── */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Resetear Contraseña — {resetUser?.username}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            fullWidth
            helperText="Mínimo 6 caracteres"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleResetSubmit} disabled={resetLoading}>
            {resetLoading ? <CircularProgress size={20} /> : 'Resetear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
