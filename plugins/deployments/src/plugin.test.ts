import { deploymentsPlugin } from './plugin';

describe('deployments', () => {
  it('should export plugin', () => {
    expect(deploymentsPlugin).toBeDefined();
  });
});
