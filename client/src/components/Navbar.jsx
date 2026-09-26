import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined'
import { useCart } from '../context/CartContext.jsx'
import { useAuthContext } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

export default function Navbar() {
  const { count } = useCart()
  const { user, isAdmin, openSignIn, logout } = useAuthContext()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const menuOpen = Boolean(anchorEl)

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const go = (to) => {
    handleMenuClose()
    navigate(to)
  }

  const handleSignOut = () => {
    handleMenuClose()
    logout()
    navigate('/')
  }

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.appBar }}>
      {settings.announcement ? (
        <Box
          sx={{
            background: 'linear-gradient(90deg, #A8562F, #C96F4A, #A8562F)',
            color: '#F2DFAE',
            textAlign: 'center',
            px: 2,
            py: 0.9,
            fontSize: '0.8rem',
            letterSpacing: '0.04em',
            fontWeight: 500
          }}
        >
          {settings.announcement}
        </Box>
      ) : null}
      <AppBar position="static" elevation={0}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ py: 0.5 }}>
            <Typography
              component={RouterLink}
              to="/"
              variant="h5"
              sx={{
                fontFamily: '"Fraunces",Georgia,serif',
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                flexGrow: 1,
                letterSpacing: '0.01em',
                fontSize: { xs: '1.1rem', sm: '1.5rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0
              }}
            >
              {settings.logoText || 'Shreeji & Shreeji'}
              <Box
                component="span"
                sx={{
                  display: 'block',
                  height: 2,
                  width: 44,
                  mt: 0.3,
                  borderRadius: 2,
                  background: 'linear-gradient(90deg,#D9A441,transparent)'
                }}
              />
            </Typography>
            <Button
              component={RouterLink}
              to="/hampers"
              variant="contained"
              color="secondary"
              size="small"
              sx={{ mr: 1, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Build a Hamper
            </Button>
            <IconButton
              component={RouterLink}
              to="/cart"
              aria-label="Your hamper"
              sx={{ mr: 0.5, color: 'text.primary' }}
            >
              <Badge badgeContent={count} color="primary">
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>
            {user ? (
              <>
                <IconButton aria-label="Account" onClick={handleMenuOpen} sx={{ color: 'text.primary' }}>
                  <PersonOutlineIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={handleMenuClose}
                  PaperProps={{ sx: { borderRadius: 3, minWidth: 200 } }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {user.name || 'Welcome'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.phone}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => go('/profile')}>My Profile</MenuItem>
                  <MenuItem onClick={() => go('/orders')}>My Orders</MenuItem>
                  {isAdmin ? <MenuItem onClick={() => go('/admin')}>Admin Dashboard</MenuItem> : null}
                  <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
                </Menu>
              </>
            ) : (
              <Button variant="outlined" color="primary" onClick={() => openSignIn()}>
                Sign in
              </Button>
            )}
          </Toolbar>
        </Container>
      </AppBar>
    </Box>
  )
}
