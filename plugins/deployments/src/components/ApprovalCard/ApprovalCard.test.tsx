import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalCard } from './ApprovalCard';
import { PendingApproval } from '@internal/plugin-deployments-common';

const mockApproval: PendingApproval = {
  deploymentId: 123,
  environment: 'production',
  version: 'v1.2.3',
  triggeredBy: {
    login: 'testuser',
    id: 456,
    avatar_url: 'https://github.com/testuser.png',
    html_url: 'https://github.com/testuser',
  },
  requestedAt: new Date('2023-01-01T10:00:00Z'),
  requiredReviewers: ['reviewer1', 'reviewer2'],
  requiredTeams: ['team1'],
  canApprove: true,
  deploymentUrl: 'https://github.com/owner/repo/deployments',
};

describe('ApprovalCard', () => {
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders approval information correctly', () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(
      screen.getByText('Deployment Approval Required'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/environment is waiting for approval/),
    ).toBeInTheDocument();
    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('reviewer1')).toBeInTheDocument();
    expect(screen.getByText('reviewer2')).toBeInTheDocument();
    expect(screen.getByText('@team1')).toBeInTheDocument();
  });

  it('shows approve and reject buttons when user can approve', () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('shows permission message when user cannot approve', () => {
    const nonApprovableApproval = { ...mockApproval, canApprove: false };

    render(
      <ApprovalCard
        approval={nonApprovableApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(
      screen.getByText("You don't have permission to approve this deployment"),
    ).toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('opens approval dialog when approve button is clicked', async () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(screen.getByText('Approve Deployment')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to approve the deployment of/),
      ).toBeInTheDocument();
    });
  });

  it('calls onApprove when approval is confirmed', async () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    // Open approval dialog
    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(screen.getByText('Approve Deployment')).toBeInTheDocument();
    });

    // Add a comment
    const commentField = screen.getByPlaceholderText(
      'Add a comment about this approval...',
    );
    fireEvent.change(commentField, { target: { value: 'LGTM!' } });

    // Confirm approval
    const approveButton = screen
      .getAllByText('Approve')
      .find(button => button.closest('[role="dialog"]'));
    fireEvent.click(approveButton!);

    await waitFor(() => {
      expect(mockOnApprove).toHaveBeenCalledWith(123, 'LGTM!');
    });
  });

  it('opens reject dialog when reject button is clicked', async () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    fireEvent.click(screen.getByText('Reject'));

    await waitFor(() => {
      expect(screen.getByText('Reject Deployment')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to reject the deployment of/),
      ).toBeInTheDocument();
    });
  });

  it('does not show reject button when onReject is not provided', () => {
    render(<ApprovalCard approval={mockApproval} onApprove={mockOnApprove} />);

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('shows GitHub link', () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    const githubLink = screen.getByText('View on GitHub');
    expect(githubLink).toBeInTheDocument();
    expect(githubLink.closest('button')).toBeInTheDocument();
  });

  it('formats time ago correctly', () => {
    const recentApproval = {
      ...mockApproval,
      requestedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    };

    render(
      <ApprovalCard
        approval={recentApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText(/5m ago/)).toBeInTheDocument();
  });
});
