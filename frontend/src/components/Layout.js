import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  TextField,
  InputAdornment,
  Paper,
  Popper,
  ClickAwayListener,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People,
  Chair,
  Inventory,
  Assessment,
  Logout,
  ManageAccounts,
  History,
  Search as SearchIcon,
  Person as PersonIcon,
  MedicalServices as MedIcon,
} from '@mui/icons-material';
import authService from '../services/authService';
import api from '../services/api';

const drawerWidth = 240;

// Etiquetas de rol en español
const roleLabels = {
  admin: 'Administrador',
  enfermera: 'Enfermera',
  administracion: 'Administración',
};

// Colores de chip por rol
const roleColors = {
  admin: 'error',
  enfermera: 'primary',
  administracion: 'success',
};

// Todos los items de menú con sus roles permitidos
const allMenuItems = [
  { text: 'Acceso Rápido', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'enfermera', 'administracion'] },
  { text: 'Pacientes',     icon: <People />,        path: '/patients',  roles: ['admin', 'enfermera'] },
  { text: 'Sillones',      icon: <Chair />,          path: '/chairs',    roles: ['admin', 'enfermera'] },
  { text: 'Inventario',    icon: <Inventory />,      path: '/inventory', roles: ['admin', 'enfermera', 'administracion'] },
  { text: 'Reportes',      icon: <Assessment />,     path: '/reports',   roles: ['admin', 'administracion'] },
  { text: 'Usuarios',    icon: <ManageAccounts />, path: '/users',  roles: ['admin'] },
  { text: 'Auditoría',  icon: <History />,        path: '/audit',  roles: ['admin'] },
];

const Layout = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const user = authService.getCurrentUser();

  // === Búsqueda global ===
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get('/search', { params: { q: q.trim() } });
      setSearchResults(res.data?.data || null);
    } catch {
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, doSearch]);

  const handleSearchSelect = (type) => {
    setSearchQuery('');
    setSearchResults(null);
    if (type === 'paciente') navigate('/patients');
    else if (type === 'medicamento') navigate('/inventory');
  };

  // Filtrar menú según rol del usuario
  const menuItems = allMenuItems.filter(item => item.roles.includes(user?.role));

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = () => authService.logout();

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Sistema CDIEM
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Sistema de Gestión — CDIEM
          </Typography>

          {/* Búsqueda global */}
          <Box ref={searchRef} sx={{ position: 'relative', mr: 2, display: { xs: 'none', md: 'block' } }}>
            <TextField
              size="small"
              placeholder="Buscar pacientes o medicamentos…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                width: 280,
                bgcolor: 'rgba(255,255,255,0.15)',
                borderRadius: 1,
                '& .MuiInputBase-input': { color: '#fff' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                '& .MuiInputAdornment-root': { color: 'rgba(255,255,255,0.7)' },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      {searchLoading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                    </InputAdornment>
                  ),
                }
              }}
            />
            <Popper
              open={!!searchResults}
              anchorEl={searchRef.current}
              placement="bottom-start"
              sx={{ zIndex: 1300, width: 320 }}
            >
              <ClickAwayListener onClickAway={() => setSearchResults(null)}>
                <Paper sx={{ mt: 0.5, maxHeight: 350, overflow: 'auto' }}>
                  {searchResults?.pacientes?.length > 0 && (
                    <>
                      <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block', color: 'text.secondary', fontWeight: 'bold' }}>
                        Pacientes
                      </Typography>
                      {searchResults.pacientes.map(p => (
                        <MenuItem key={`p-${p.id}`} onClick={() => handleSearchSelect('paciente')}
                          sx={{ display: 'flex', gap: 1 }}>
                          <PersonIcon fontSize="small" color="primary" />
                          <Box>
                            <Typography variant="body2">{p.nombreCompleto}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.tipoIdentificacion === 'rut' ? p.rut : p.pasaporte} · {p.estado}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </>
                  )}
                  {searchResults?.medicamentos?.length > 0 && (
                    <>
                      <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block', color: 'text.secondary', fontWeight: 'bold' }}>
                        Medicamentos
                      </Typography>
                      {searchResults.medicamentos.map(m => (
                        <MenuItem key={`m-${m.id}`} onClick={() => handleSearchSelect('medicamento')}
                          sx={{ display: 'flex', gap: 1 }}>
                          <MedIcon fontSize="small" color="secondary" />
                          <Box>
                            <Typography variant="body2">{m.nombre}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Stock: {m.cantidad} {m.unidad} · {m.categoria}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </>
                  )}
                  {searchResults?.pacientes?.length === 0 && searchResults?.medicamentos?.length === 0 && (
                    <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      Sin resultados para "{searchQuery}"
                    </Typography>
                  )}
                </Paper>
              </ClickAwayListener>
            </Popper>
          </Box>

          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" fontWeight="bold">{user?.username}</Typography>
                  <Chip
                    label={roleLabels[user?.role] || user?.role}
                    color={roleColors[user?.role] || 'default'}
                    size="small"
                  />
                </Box>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText>Salir</ListItemText>
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
