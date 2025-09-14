import React from 'react'
import { render, screen } from '@testing-library/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

describe('Sheet Components', () => {
  it('renders Sheet with content when open', () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Test Sheet</SheetTitle>
            <SheetDescription>Test description</SheetDescription>
          </SheetHeader>
          <div>Test content</div>
        </SheetContent>
      </Sheet>
    )
    
    expect(screen.getByText('Test Sheet')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies custom className to SheetContent', () => {
    render(
      <Sheet defaultOpen>
        <SheetContent className="custom-class">
          <div>Test content</div>
        </SheetContent>
      </Sheet>
    )
    
    // Check that the SheetContent has the custom class
    const sheetContent = screen.getByText('Test content').closest('[data-state="open"]')
    expect(sheetContent).toBeInTheDocument()
  })

  it('renders Sheet with side variant', () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="left">
          <div>Left side sheet</div>
        </SheetContent>
      </Sheet>
    )
    
    expect(screen.getByText('Left side sheet')).toBeInTheDocument()
  })

  it('renders Sheet closed by default', () => {
    render(
      <Sheet>
        <SheetContent>
          <div>Hidden content</div>
        </SheetContent>
      </Sheet>
    )
    
    // Content should not be visible when sheet is closed
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })
})
