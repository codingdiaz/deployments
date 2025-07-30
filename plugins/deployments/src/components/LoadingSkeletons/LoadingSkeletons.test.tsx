import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  EnvironmentCardSkeleton,
  ApplicationCardSkeleton,
  DeploymentHistoryTableSkeleton,
  DeploymentStatusSkeleton,
  WorkflowListSkeleton,
} from './LoadingSkeletons';

describe('LoadingSkeletons', () => {
  describe('EnvironmentCardSkeleton', () => {
    it('renders skeleton structure for environment card', () => {
      render(<EnvironmentCardSkeleton />);
      
      // Should render as a Material-UI Card
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('ApplicationCardSkeleton', () => {
    it('renders skeleton structure for application card', () => {
      render(<ApplicationCardSkeleton />);
      
      // Should render multiple skeleton elements
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('DeploymentHistoryTableSkeleton', () => {
    it('renders 5 skeleton rows by default', () => {
      render(<DeploymentHistoryTableSkeleton />);
      
      // Should render skeleton elements for table rows
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      // Each row has multiple skeleton elements (status, version, time, etc.)
      expect(skeletons.length).toBeGreaterThan(20); // 5 rows * ~6 elements per row
    });
  });

  describe('DeploymentStatusSkeleton', () => {
    it('renders skeleton elements for status display', () => {
      render(<DeploymentStatusSkeleton />);
      
      // Should render skeleton elements for status display
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBe(4); // Status chip, version, date, button
    });
  });

  describe('WorkflowListSkeleton', () => {
    it('renders 3 skeleton workflow items by default', () => {
      render(<WorkflowListSkeleton />);
      
      // Should render skeleton elements for workflow list
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBe(6); // 3 items * 2 lines each
    });
  });
});