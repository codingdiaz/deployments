## Ad-Hoc document of TODO's and Found Issues

- We recently swapped out the GitHub Service API to use the GitHub deployments API. While that works great for reading data, in our setup we actually want to just trigger a GitHub action workflow with workflow disbatch to trigger a deployment rather than trigger a deployment via the deployment's API. GitHub will handle creating and managing that workflow's deployment status so the read functionality will just work. Can you revert the functionality of triggering a deployment to use an environment's config to simply trigger a GitHub action workflow if it exists in the environment settings.
- We no longer need certain settings on the environment page. For example, we no longer care about the job name.
- We should auto populate Workflow paths in the environment create/edit
- Make sure we are using API Refs https://backstage.io/docs/api/utility-apis/
- Approvals testing/working example
- We need a sidebar component
- GitHub link still doesn't work
- document monorepos
- Log viewer
- Analyze if we can make this generic or is it too GitHub specific?



 Here is some context on a previous conversation we had. ⏺ Based on my analysis, here's how your UI currently handles the three 
  deployment strategies and
    potential issues:

    Current Implementation Analysis

    How it currently works:
    - Each environment has a workflowPath (e.g., .github/workflows/deploy.yml) and jobName
    - The UI filters workflows by finding the workflow file at the specified path
    - It shows ALL runs for that specific workflow file (GitHubApiService.ts:518-579)

    Issues with Your Three Strategies:

    Strategy 1: Single workflow with environment input

    - ❌ PROBLEM: Shows ALL workflow runs (dev + prod mixed together)
    - The UI currently displays all runs from .github/workflows/deploy.yml without filtering by
    environment
    - You'll see both dev and prod deployments in both environment cards

    Strategy 2: Separate workflows per environment

    - ✅ WORKS: Each environment points to different workflow files
    - dev environment → .github/workflows/deploy-dev.yml
    - prod environment → .github/workflows/deploy-prod.yml
    - Each environment card shows only relevant runs

    Strategy 3: Single CD workflow (dev → prod sequentially)

    - ❌ PROBLEM: Same issue as Strategy 1
    - Both environments would point to the same workflow file
    - Can't differentiate which runs are for which environment

    Missing Functionality

    The current implementation lacks environment-specific workflow run filtering. You need:

    1. Input-based filtering (GitHubApiService.ts:518): Currently gets all runs for a workflow, but
    doesn't filter by the environment input parameter
    2. Job-level filtering (GitHubApiService.ts:529): Comments indicate job filtering isn't implemented
    3. Environment context parsing: No logic to parse workflow inputs or job outputs to determine
    target environment

    Recommendation

    To support all three strategies, you need to enhance the filtering logic in
    GitHubApiService.getDeploymentStatus() and getDeploymentHistory() to:

    1. Parse workflow run inputs to match the environment parameter
    2. Filter runs by the specific job name within multi-job workflows
    3. Add environment context extraction from workflow run metadata

    Strategy 2 (separate workflows) is the only one that works properly with the current
    implementation.

      A workflow run would show up in the "dev" environment card if ANY of these are true:

    1. Workflow Dispatch: environment: "dev" input
    2. Job Name: "deploy-to-dev" job exists
    3. Run Title: "Deploy application to dev environment"
    4. Branch: Triggered from dev branch
    5. Workflow File: Uses deploy-dev.yml workflow


    We probably need to use the deployment's API and NOT the GitHub Actions API's so much? It looks like we can pass in what "version"
   to run and then we know the environment which should be good enough? https://github.com/orgs/community/discussions/36919 I want to 
  basically change the way we lookup deployments. While there is a bit of tradeoff, I want to use the GitHub deployments API as the 
  source of truth. This will require folks to use GitHub environments in GitHub actions but it also allows for any third party 
  deployment tool to fit cleanly into the plugin (at least to start). Can we update the application to use the GitHub deployments API 
  (but then lookup whatever you need based on the job inputs). For now we are assuming someone is using GitHub Actions + GitHub 
  Deployments. I believe this makes the environment config not as required but just leave it all in there for now to reduce the scope 
  of this change.