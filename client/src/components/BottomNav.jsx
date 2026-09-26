import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Badge from '@mui/material/Badge'
import HomeIcon from '@mui/icons-material/Home'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { useCart } from '../context/CartContext.jsx'
import { useAuthContext } from '../context/AuthContext.jsx'

export default function BottomNav() {
  const { count } = useCart()
  const { user, openSignIn } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [value, setValue] = useState(location.pathname)

  const handleChange = (_event, newValue) => {
    if (newValue === 'account') {
      if (user) {
        setValue('/profile')
        navigate('/profile')
      } else {
        openSignIn('/profile')
      }
      return
    }
    setValue(newValue)
    navigate(newValue)
  }

  return (
    <BottomNavigation
      value={value}
      onChange={handleChange}
      showLabels
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'flex', md: 'none' },
        borderTop: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.appBar
      }}
    >
      <BottomNavigationAction label="Home" value="/" icon={<HomeIcon />} />
      <BottomNavigationAction
        label="Build"
        value="/hampers"
        icon={<CardGiftcardIcon />}
      />
      <BottomNavigationAction
        label="Cart"
        value="/cart"
        icon={
          <Badge badgeContent={count} color="primary">
            <ShoppingCartIcon />
          </Badge>
        }
      />
      <BottomNavigationAction
        label="Account"
        value={user ? '/profile' : 'account'}
        icon={<AccountCircleIcon />}
      />
    </BottomNavigation>
  )
}
