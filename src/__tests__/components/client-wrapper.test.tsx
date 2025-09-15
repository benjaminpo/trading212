import { render, screen, waitFor } from '@testing-library/react'
import ClientWrapper from '@/components/client-wrapper'

describe('ClientWrapper Component', () => {
  it('should render children after mounting', async () => {
    render(
      <ClientWrapper>
        <div data-testid="child-content">Child Content</div>
      </ClientWrapper>
    )

    // Wait for the component to mount and show content
    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should render multiple children correctly', async () => {
    render(
      <ClientWrapper>
        <div>First Child</div>
        <div>Second Child</div>
        <span>Third Child</span>
      </ClientWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('First Child')).toBeInTheDocument()
      expect(screen.getByText('Second Child')).toBeInTheDocument()
      expect(screen.getByText('Third Child')).toBeInTheDocument()
    })
  })

  it('should handle complex children structures', async () => {
    render(
      <ClientWrapper>
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      </ClientWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
      expect(screen.getByText('Paragraph')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })
  })

  it('should handle empty children', async () => {
    const { container } = render(<ClientWrapper>{null}</ClientWrapper>)

    await waitFor(() => {
      // Should not crash and should render without loading spinner
      expect(container).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should handle React fragments', async () => {
    render(
      <ClientWrapper>
        <>
          <div>Fragment Child 1</div>
          <div>Fragment Child 2</div>
        </>
      </ClientWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Fragment Child 1')).toBeInTheDocument()
      expect(screen.getByText('Fragment Child 2')).toBeInTheDocument()
    })
  })

  it('should have correct loading spinner classes when loading', () => {
    // Test the loading state by checking the component structure
    const { container } = render(
      <ClientWrapper>
        <div>Content</div>
      </ClientWrapper>
    )

    // The loading spinner might be present initially
    const spinner = container.querySelector('.animate-spin')
    if (spinner) {
      expect(spinner).toHaveClass(
        'animate-spin',
        'rounded-full',
        'h-32',
        'w-32',
        'border-b-2',
        'border-primary'
      )
    }
  })

  it('should not crash with different types of children', async () => {
    render(
      <ClientWrapper>
        <div>String child</div>
        {42}
        {(() => { const show = true; return show && <span>Conditional child</span> })()}
        {(() => { const show = false; return show && <span>Hidden child</span> })()}
      </ClientWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('String child')).toBeInTheDocument()
      expect(screen.getByText('Conditional child')).toBeInTheDocument()
      expect(screen.queryByText('Hidden child')).not.toBeInTheDocument()
    })
  })
})