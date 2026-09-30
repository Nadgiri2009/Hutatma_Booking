import React, { useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar,
  Divider, Tooltip, Menu, MenuItem, useMediaQuery, useTheme,
  Collapse, Badge,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, ConfirmationNumber, Apartment,
  CurrencyRupee, Event, PhotoLibrary, Notifications, People,
  Report, Cancel, Print, ExpandLess, ExpandMore, Logout,
  AccountCircle, Settings, ChevronLeft,
  AssignmentReturn,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const DRAWER_WIDTH = 260;

const navSections = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard',   icon: <Dashboard />,          path: '/admin/dashboard'   },
      { label: 'Bookings',    icon: <ConfirmationNumber />,  path: '/admin/bookings'    },
      { label: 'Payments',    icon: <CurrencyRupee />,       path: '/admin/payments'    },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Venues & Pricing', icon: <Apartment />,      path: '/admin/venues'      },
      { label: 'Holidays',    icon: <Event />,               path: '/admin/holidays'    },
      { label: 'Gallery',     icon: <PhotoLibrary />,        path: '/admin/gallery'     },
      { label: 'Notices',     icon: <Notifications />,       path: '/admin/notices'     },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Complaints',  icon: <Report />,              path: '/admin/complaints'  },
      { label: 'Cancellations', icon: <Cancel />,            path: '/admin/cancellations' },
      { label: 'Refund Requests', icon: <AssignmentReturn />, path: '/admin/refunds' },
      { label: 'Users',       icon: <People />,              path: '/admin/users'       },
      { label: 'Print Receipt', icon: <Print />,             path: '/admin/receipts'    },
    ],
  },
];

const AdminLayout: React.FC = () => {
  const [open, setOpen]         = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const auth     = useSelector((s: RootState) => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex', alignItems: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #0f2340 0%, #1a3a6b 100%)',
          minHeight: 72,
        }}
      >
        <Avatar sx={{ bgcolor: '#c9a227', width: 40, height: 40, fontSize: '1rem', fontWeight: 800 }}>
          HSM
        </Avatar>
        {open && (
          <Box>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
              Hutatma Smruti Mandir
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Admin Panel
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Nav sections */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {navSections.map((section) => (
          <Box key={section.label}>
            {open && (
              <Typography
                variant="caption"
                sx={{ px: 2.5, py: 1, display: 'block', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', fontSize: '0.68rem' }}
              >
                {section.label}
              </Typography>
            )}
            {section.items.map((item) => (
              <Tooltip key={item.path} title={!open ? item.label : ''} placement="right">
                <ListItem disablePadding sx={{ px: 1, mb: 0.3 }}>
                  <ListItemButton
                    onClick={() => { navigate(item.path); if (isMobile) setOpen(false); }}
                    selected={isActive(item.path)}
                    sx={{
                      borderRadius: 1.5,
                      minHeight: 44,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(26,58,107,0.12)',
                        color: '#1a3a6b',
                        '& .MuiListItemIcon-root': { color: '#1a3a6b' },
                        '&:hover': { bgcolor: 'rgba(26,58,107,0.16)' },
                      },
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: open ? 40 : 'unset',
                        color: isActive(item.path) ? '#1a3a6b' : '#64748b',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: isActive(item.path) ? 700 : 500,
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            ))}
            <Divider sx={{ my: 1, mx: 1 }} />
          </Box>
        ))}
      </Box>

      {/* User info at bottom */}
      <Box
        sx={{
          p: 2, borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 1.5,
          bgcolor: '#f8fafc',
        }}
      >
        <Avatar sx={{ bgcolor: '#1a3a6b', width: 36, height: 36, fontSize: '0.85rem' }}>
          {auth.fullName?.charAt(0) || 'A'}
        </Avatar>
        {open && (
          <Box flex={1} minWidth={0}>
            <Typography variant="body2" fontWeight={600} noWrap>{auth.fullName}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{auth.role}</Typography>
          </Box>
        )}
        {open && (
          <Tooltip title="Logout">
            <IconButton size="small" onClick={handleLogout} color="error">
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ displayPrint: 'none', '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          open={open}
          sx={{
            displayPrint: 'none',
            width: open ? DRAWER_WIDTH : 72,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: open ? DRAWER_WIDTH : 72,
              transition: 'width 0.25s ease',
              overflowX: 'hidden',
              boxSizing: 'border-box',
              borderRight: '1px solid #e2e8f0',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top AppBar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: '#fff',
            borderBottom: '1px solid #e2e8f0',
            color: '#1a2332',
            displayPrint: 'none',
          }}
        >
          <Toolbar>
            <IconButton onClick={() => setOpen((v) => !v)} sx={{ mr: 1, color: '#1a3a6b' }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ flex: 1 }}>
              Hutatma Smruti Mandir — Admin
            </Typography>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ color: '#1a3a6b' }}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Typography variant="body2" fontWeight={600}>{auth.fullName}</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <Logout fontSize="small" sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
