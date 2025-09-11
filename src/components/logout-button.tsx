'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export default function LogoutButton({ variant = 'outline', size = 'sm', className }: LogoutButtonProps) {
  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleLogout}
      className={className}
      title="Sign Out"
    >
      <LogOut className="h-4 w-4" />
      {size !== 'icon' && <span className="ml-2">Sign Out</span>}
    </Button>
  )
}
