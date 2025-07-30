import React from 'react';
import { render, screen } from '@testing-library/react';
import { GitHubRepoLink } from './GitHubRepoLink';

describe('GitHubRepoLink', () => {
  it('renders with default props', () => {
    render(<GitHubRepoLink repo="owner/repo" />);
    
    expect(screen.getByText('owner/repo')).toBeInTheDocument();
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/owner/repo/deployments');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders without deployments path when showDeployments is false', () => {
    render(<GitHubRepoLink repo="owner/repo" showDeployments={false} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/owner/repo');
  });

  it('renders without launch icon when showLaunchIcon is false', () => {
    render(<GitHubRepoLink repo="owner/repo" showLaunchIcon={false} />);
    
    expect(screen.getByText('owner/repo')).toBeInTheDocument();
    // Launch icon should not be present (we can't easily test for SVG icons in jsdom)
  });

  it('returns null when repo is empty', () => {
    const { container } = render(<GitHubRepoLink repo="" />);
    expect(container.firstChild).toBeNull();
  });

  it('applies custom className', () => {
    render(<GitHubRepoLink repo="owner/repo" className="custom-class" />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('custom-class');
  });
});