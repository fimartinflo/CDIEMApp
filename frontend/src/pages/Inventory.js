import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import esLocale from 'date-fns/locale/es';
import inventoryService from '../services/inventoryService';
import authService from '../services/authService';

const CATEGORIAS = [
  { value: 'general',       label: 'General',       color: 'default' },
  { value: 'quimioterapia', label: 'Quimioterapia', color: 'error'   },
  { value: 'premedicacion', label: 'Premedicación', color: 'warning' },
  { value: 'antiemeticos',  label: 'Antieméticos',  color: 'info'    },
  { value: 'soporte',       label: 'Soporte',       color: 'success' },
];
const catLabel = (v) => CATEGORIAS.find(c => c.value === v)?.label || v;
const catColor = (v) => CATEGORIAS.find(c => c.value === v)?.color || 'default';

const Inventory = () => {
  const userRole = authService.getCurrentUser()?.role;
  const canWrite = userRole === 'admin' || userRole === 'administracion';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');

  // Derivado — no duplicar el filter en JSX
  const filteredItems = items.filter(
    i => i.activo !== false && (!categoriaFilter || i.categoria === categoriaFilter)
  );

  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openQuantityDialog, setOpenQuantityDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: null });

  const [newItem, setNewItem] = useState({
    nombre: '', descripcion: '', cantidad: 0, unidad: 'unidad',
    precio: 0, fechaExpiracion: null, proveedor: '', minimoStock: 10, categoria: 'general'
  });

  const [editItem, setEditItem] = useState({
    id: '', nombre: '', descripcion: '', cantidad: 0, unidad: 'unidad',
    precio: 0, fechaExpiracion: null, proveedor: '', minimoStock: 10, categoria: 'general'
  });
  
  const [quantityData, setQuantityData] = useState({
    id: '',
    cantidad: 0,
    tipo: 'entrada',
    motivo: ''
  });

  // Cargar inventario
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const result = await inventoryService.getItems();
      setItems(result.data || []);
    } catch (err) {
      setError('Error al cargar inventario');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Crear medicamento
  const handleCreate = async () => {
    if (!newItem.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!newItem.precio || newItem.precio <= 0) { setError('El precio en CLP es obligatorio y debe ser mayor a 0'); return; }
    try {
      await inventoryService.createItem(newItem);
      setSuccess('Medicamento creado exitosamente');
      setOpenDialog(false);
      setNewItem({
        nombre: '', descripcion: '', cantidad: 0, unidad: 'unidad',
        precio: 0, fechaExpiracion: null, proveedor: '', minimoStock: 10, categoria: 'general'
      });
      loadItems();
    } catch (err) {
      setError('Error al crear medicamento');
    }
  };

  // Actualizar medicamento
  const handleEdit = async () => {
    if (!editItem.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!editItem.precio || editItem.precio <= 0) { setError('El precio en CLP es obligatorio y debe ser mayor a 0'); return; }
    try {
      await inventoryService.updateItem(editItem.id, editItem);
      setSuccess('Medicamento actualizado exitosamente');
      setOpenEditDialog(false);
      loadItems();
    } catch (err) {
      setError('Error al actualizar medicamento');
    }
  };

  // Eliminar medicamento
  const handleDelete = (id) => {
    setConfirmDialog({
      open: true,
      message: '¿Está seguro de eliminar este medicamento?',
      onConfirm: async () => {
        setConfirmDialog({ open: false, message: '', onConfirm: null });
        try {
          await inventoryService.deleteItem(id);
          setSuccess('Medicamento eliminado exitosamente');
          loadItems();
        } catch (err) {
          setError('Error al eliminar medicamento');
        }
      }
    });
  };

  // Actualizar cantidad
  const handleUpdateQuantity = async () => {
    try {
      await inventoryService.updateQuantity(
        quantityData.id,
        quantityData.cantidad,
        quantityData.tipo,
        quantityData.motivo
      );
      setSuccess(`Stock ${quantityData.tipo === 'entrada' ? 'aumentado' : 'reducido'} exitosamente`);
      setOpenQuantityDialog(false);
      setQuantityData({
        id: '',
        cantidad: 0,
        tipo: 'entrada',
        motivo: ''
      });
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar stock');
    }
  };

  // Verificar si está por vencer (30 días)
  const isExpiringSoon = (fechaExpiracion) => {
    if (!fechaExpiracion) return false;
    const hoy = new Date();
    const expiracion = new Date(fechaExpiracion);
    const diasRestantes = Math.ceil((expiracion - hoy) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 30 && diasRestantes > 0;
  };

  // Verificar si está vencido
  const isExpired = (fechaExpiracion) => {
    if (!fechaExpiracion) return false;
    const hoy = new Date();
    const expiracion = new Date(fechaExpiracion);
    return expiracion < hoy;
  };

  // Verificar si está bajo stock
  const isLowStock = (cantidad, minimoStock) => {
    return cantidad <= minimoStock;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={esLocale}>
      <Container maxWidth="xl">
        {/* Encabezado */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Gestión de Inventario
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Control de medicamentos y suministros oncológicos
          </Typography>
        </Box>

        {/* Barra de herramientas */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6">
                Total: {filteredItems.length} medicamentos
              </Typography>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Filtrar por categoría</InputLabel>
                <Select
                  value={categoriaFilter}
                  label="Filtrar por categoría"
                  onChange={(e) => setCategoriaFilter(e.target.value)}
                >
                  <MenuItem value="">Todas las categorías</MenuItem>
                  {CATEGORIAS.map(c => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {canWrite && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
                Nuevo Medicamento
              </Button>
            )}
          </Box>
        </Paper>

        {/* Tabla de inventario */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell align="right">Precio (CLP)</TableCell>
                  <TableCell>Fecha Expiración</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item) => {
                    const expiringSoon = isExpiringSoon(item.fechaExpiracion);
                    const expired = isExpired(item.fechaExpiracion);
                    const lowStock = isLowStock(item.cantidad, item.minimoStock);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.nombre}</TableCell>
                        <TableCell>
                          <Chip
                            label={catLabel(item.categoria || 'general')}
                            color={catColor(item.categoria || 'general')}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{item.descripcion}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {item.cantidad}
                            {lowStock && (
                              <WarningIcon color="warning" sx={{ ml: 1, fontSize: 16 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{item.unidad}</TableCell>
                        <TableCell align="right">
                          {item.precio ? `$${item.precio.toLocaleString('es-CL')}` : <Chip label="Sin precio" color="error" size="small" />}
                        </TableCell>
                        <TableCell>
                          {item.fechaExpiracion ? new Date(item.fechaExpiracion).toLocaleDateString('es-CL') : 'N/A'}
                          {expired && (
                            <Chip
                              icon={<ErrorIcon />}
                              label="Vencido"
                              color="error"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                          {expiringSoon && !expired && (
                            <Chip
                              label="Por vencer"
                              color="warning"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>{item.proveedor || 'N/A'}</TableCell>
                        <TableCell>
                          {lowStock && (
                            <Chip
                              label="Bajo stock"
                              color="warning"
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          )}
                          {item.cantidad === 0 && (
                            <Chip
                              label="Agotado"
                              color="error"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {canWrite && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setQuantityData({
                                    id: item.id,
                                    cantidad: 0,
                                    tipo: 'entrada',
                                    motivo: ''
                                  });
                                  setOpenQuantityDialog(true);
                                }}
                                color="primary"
                              >
                                <InventoryIcon />
                              </IconButton>

                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditItem({
                                    id: item.id,
                                    nombre: item.nombre,
                                    descripcion: item.descripcion,
                                    cantidad: item.cantidad,
                                    unidad: item.unidad,
                                    precio: item.precio || 0,
                                    fechaExpiracion: item.fechaExpiracion ? new Date(item.fechaExpiracion) : null,
                                    proveedor: item.proveedor,
                                    minimoStock: item.minimoStock,
                                    categoria: item.categoria || 'general'
                                  });
                                  setOpenEditDialog(true);
                                }}
                                color="warning"
                              >
                                <EditIcon />
                              </IconButton>

                              <IconButton
                                size="small"
                                onClick={() => handleDelete(item.id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Diálogo: Crear medicamento */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Nuevo Medicamento</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Nombre *"
                value={newItem.nombre}
                onChange={(e) => setNewItem({...newItem, nombre: e.target.value})}
                fullWidth
                required
              />
              
              <TextField
                label="Descripción"
                value={newItem.descripcion}
                onChange={(e) => setNewItem({...newItem, descripcion: e.target.value})}
                fullWidth
                multiline
                rows={2}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Cantidad *"
                  type="number"
                  value={newItem.cantidad}
                  onChange={(e) => setNewItem({...newItem, cantidad: parseInt(e.target.value) || 0})}
                  fullWidth
                  required
                />

                <TextField
                  label="Unidad"
                  value={newItem.unidad}
                  onChange={(e) => setNewItem({...newItem, unidad: e.target.value})}
                  fullWidth
                />
              </Box>

              <TextField
                label="Precio Unitario (CLP) *"
                type="number"
                value={newItem.precio}
                onChange={(e) => setNewItem({...newItem, precio: parseInt(e.target.value) || 0})}
                fullWidth
                required
                inputProps={{ min: 1 }}
                helperText="Valor en pesos chilenos — se usará en los informes de costos"
                error={newItem.precio <= 0}
              />

              <DatePicker
                label="Fecha de Expiración"
                value={newItem.fechaExpiracion}
                onChange={(date) => setNewItem({...newItem, fechaExpiracion: date})}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
              
              <TextField
                label="Proveedor"
                value={newItem.proveedor}
                onChange={(e) => setNewItem({...newItem, proveedor: e.target.value})}
                fullWidth
              />
              
              <TextField
                label="Stock Mínimo *"
                type="number"
                value={newItem.minimoStock}
                onChange={(e) => setNewItem({...newItem, minimoStock: parseInt(e.target.value) || 0})}
                fullWidth
                required
                helperText="Alerta cuando la cantidad sea igual o inferior a este valor"
              />

              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={newItem.categoria}
                  label="Categoría"
                  onChange={(e) => setNewItem({...newItem, categoria: e.target.value})}
                >
                  {CATEGORIAS.map(c => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} variant="contained">Crear</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo: Editar medicamento */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Editar Medicamento</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Nombre *"
                value={editItem.nombre}
                onChange={(e) => setEditItem({...editItem, nombre: e.target.value})}
                fullWidth
                required
              />
              
              <TextField
                label="Descripción"
                value={editItem.descripcion}
                onChange={(e) => setEditItem({...editItem, descripcion: e.target.value})}
                fullWidth
                multiline
                rows={2}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Cantidad *"
                  type="number"
                  value={editItem.cantidad}
                  onChange={(e) => setEditItem({...editItem, cantidad: parseInt(e.target.value) || 0})}
                  fullWidth
                  required
                />

                <TextField
                  label="Unidad"
                  value={editItem.unidad}
                  onChange={(e) => setEditItem({...editItem, unidad: e.target.value})}
                  fullWidth
                />
              </Box>

              <TextField
                label="Precio Unitario (CLP) *"
                type="number"
                value={editItem.precio}
                onChange={(e) => setEditItem({...editItem, precio: parseInt(e.target.value) || 0})}
                fullWidth
                required
                inputProps={{ min: 1 }}
                helperText="Valor en pesos chilenos — se usará en los informes de costos"
                error={editItem.precio <= 0}
              />

              <DatePicker
                label="Fecha de Expiración"
                value={editItem.fechaExpiracion}
                onChange={(date) => setEditItem({...editItem, fechaExpiracion: date})}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
              
              <TextField
                label="Proveedor"
                value={editItem.proveedor}
                onChange={(e) => setEditItem({...editItem, proveedor: e.target.value})}
                fullWidth
              />
              
              <TextField
                label="Stock Mínimo *"
                type="number"
                value={editItem.minimoStock}
                onChange={(e) => setEditItem({...editItem, minimoStock: parseInt(e.target.value) || 0})}
                fullWidth
                required
              />

              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={editItem.categoria}
                  label="Categoría"
                  onChange={(e) => setEditItem({...editItem, categoria: e.target.value})}
                >
                  {CATEGORIAS.map(c => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleEdit} variant="contained">Actualizar</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo: Actualizar cantidad */}
        <Dialog open={openQuantityDialog} onClose={() => setOpenQuantityDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Actualizar Stock</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Movimiento *</InputLabel>
                <Select
                  value={quantityData.tipo}
                  label="Tipo de Movimiento *"
                  onChange={(e) => setQuantityData({...quantityData, tipo: e.target.value})}
                >
                  <MenuItem value="entrada">Entrada (Aumentar stock)</MenuItem>
                  <MenuItem value="salida">Salida (Reducir stock)</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Cantidad *"
                type="number"
                value={quantityData.cantidad}
                onChange={(e) => setQuantityData({...quantityData, cantidad: parseInt(e.target.value) || 0})}
                fullWidth
                required
              />
              
              <TextField
                label="Motivo"
                value={quantityData.motivo}
                onChange={(e) => setQuantityData({...quantityData, motivo: e.target.value})}
                fullWidth
                multiline
                rows={2}
                placeholder="Ej: Compra nueva, Consumo diario, Ajuste de inventario"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenQuantityDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdateQuantity} variant="contained">Actualizar</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de confirmación */}
        <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, message: '', onConfirm: null })}>
          <DialogTitle>Confirmar acción</DialogTitle>
          <DialogContent>{confirmDialog.message}</DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog({ open: false, message: '', onConfirm: null })}>Cancelar</Button>
            <Button onClick={confirmDialog.onConfirm} color="error" variant="contained">Confirmar</Button>
          </DialogActions>
        </Dialog>

        {/* Notificaciones */}
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>
        
        <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
};

export default Inventory;