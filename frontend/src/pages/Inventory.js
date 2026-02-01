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

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openQuantityDialog, setOpenQuantityDialog] = useState(false);
  
  // Estados para formularios
  const [newItem, setNewItem] = useState({
    nombre: '',
    descripcion: '',
    cantidad: 0,
    unidad: 'unidad',
    fechaExpiracion: null,
    proveedor: '',
    minimoStock: 10
  });
  
  const [editItem, setEditItem] = useState({
    id: '',
    nombre: '',
    descripcion: '',
    cantidad: 0,
    unidad: 'unidad',
    fechaExpiracion: null,
    proveedor: '',
    minimoStock: 10
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
    try {
      await inventoryService.createItem(newItem);
      setSuccess('Medicamento creado exitosamente');
      setOpenDialog(false);
      setNewItem({
        nombre: '',
        descripcion: '',
        cantidad: 0,
        unidad: 'unidad',
        fechaExpiracion: null,
        proveedor: '',
        minimoStock: 10
      });
      loadItems();
    } catch (err) {
      setError('Error al crear medicamento');
    }
  };

  // Actualizar medicamento
  const handleEdit = async () => {
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
  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este medicamento?')) {
      try {
        await inventoryService.deleteItem(id);
        setSuccess('Medicamento eliminado exitosamente');
        loadItems();
      } catch (err) {
        setError('Error al eliminar medicamento');
      }
    }
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Total de medicamentos: {items.length}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              Nuevo Medicamento
            </Button>
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
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Fecha Expiración</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items
                  .filter(item => item.activo !== false)
                  .map((item) => {
                    const expiringSoon = isExpiringSoon(item.fechaExpiracion);
                    const expired = isExpired(item.fechaExpiracion);
                    const lowStock = isLowStock(item.cantidad, item.minimoStock);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.nombre}</TableCell>
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
                                fechaExpiracion: item.fechaExpiracion ? new Date(item.fechaExpiracion) : null,
                                proveedor: item.proveedor,
                                minimoStock: item.minimoStock
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