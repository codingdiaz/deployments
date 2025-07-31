import { Octokit } from '@octokit/rest';

async function main() {
  const client = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const owner = 'codingdiaz';
  const repo = 'deployments';
  const environment = 'production';

  const response = await client.rest.repos.listDeployments({
    owner: 'codingdiaz',
    repo: 'deployments',
    environment: 'production',
  });

  console.log(JSON.stringify(response.data, null, 2));

  const statuses = await client.rest.repos.listDeploymentStatuses({
    owner: 'codingdiaz',
    repo: 'deployments',
    deployment_id: response.data[0].id,
  });

  const deploymentStatus = statuses.data[0];

  console.log(JSON.stringify(deploymentStatus, null, 2));

  client

  // Get workflow run
  if (deploymentStatus.target_url || deploymentStatus.log_url) {
    const url = deploymentStatus.target_url || deploymentStatus.log_url;
    const runIdMatch = url.match(/\/actions\/runs\/(\d+)/);
    
    if (runIdMatch) {
      const runId = parseInt(runIdMatch[1]);
      console.log(`\nFound workflow run ID: ${runId}`);

      try {
        // Get workflow run details
        const workflowRun = await client.rest.actions.getWorkflowRun({
          owner,
          repo,
          run_id: runId,
        });

        console.log(`Workflow: ${workflowRun.data.name}`);
        console.log(`Status: ${workflowRun.data.status}`);
        console.log(`Conclusion: ${workflowRun.data.conclusion}`);

        // Get pending deployments for this run
        const pendingDeployments = await client.rest.actions.getPendingDeploymentsForRun({
          owner,
          repo,
          run_id: runId,
        });

        if (pendingDeployments.data.length > 0) {
          console.log('\n🎯 PENDING DEPLOYMENTS:');
          console.log(JSON.stringify(pendingDeployments.data, null, 2));

          // Parse approval details
          pendingDeployments.data.forEach((pending, index) => {
            console.log(`\n--- Environment ${index + 1}: ${pending.environment.name} ---`);
            console.log(`You can approve: ${pending.current_user_can_approve}`);
            
            if (pending.wait_timer > 0) {
              console.log(`Wait timer: ${pending.wait_timer} minutes`);
              if (pending.wait_timer_started_at) {
                const startTime = new Date(pending.wait_timer_started_at);
                const waitUntil = new Date(startTime.getTime() + pending.wait_timer * 60000);
                console.log(`Wait until: ${waitUntil.toISOString()}`);
              }
            }

            console.log('Required reviewers:');
            pending.reviewers.forEach(reviewer => {
              const name = reviewer.reviewer.login || reviewer.reviewer.name;
              console.log(`  - ${reviewer.type}: ${name}`);
            });
          });
        } else {
          console.log('\nNo pending deployments found for this run');
        }

      } catch (error) {
        console.error(`Error fetching workflow run ${runId}:`, error.message);
      }
    } else {
      console.log('\nNo workflow run ID found in deployment status URLs');
    }
  } else {
    console.log('\nNo target_url or log_url found in deployment status');
  }

  const approval = await client.rest.actions.reviewPendingDeploymentsForRun

}

main();