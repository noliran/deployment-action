import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import { ReposCreateDeploymentResponseData } from "@octokit/types";

type DeploymentState =
  | "error"
  | "failure"
  | "inactive"
  | "in_progress"
  | "queued"
  | "pending"
  | "success";

async function run() {
  try {
    const context = github.context;
    const logUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}/checks`;

    const token = core.getInput("token", { required: true });
    const owner =
      core.getInput("owner", { required: false }) || context.repo.owner;
    const repo =
      core.getInput("repo", { required: false }) || context.repo.repo;
    const ref = core.getInput("ref", { required: false }) || context.ref;
    const url = core.getInput("target_url", { required: false }) || logUrl;
    const environment =
      core.getInput("environment", { required: false }) || "production";
    const description = core.getInput("description", { required: false });
    const payload = core.getInput("payload", { required: false }) || "";
    const initialStatus =
      (core.getInput("initial_status", {
        required: false,
      }) as DeploymentState) || "pending";
    const autoMergeStringInput = core.getInput("auto_merge", {
      required: false,
    });

    const auto_merge: boolean = autoMergeStringInput === "true";

    const client = new Octokit({
      auth: token,
      previews: ["flash", "ant-man"],
    });

    core.info("Creating deployment");
    const deployment = await client.repos.createDeployment({
      owner: owner,
      repo: repo,
      ref: ref,
      required_contexts: [],
      payload: payload,
      environment,
      transient_environment: true,
      auto_merge,
      description,
    });

    const deploymentId = (deployment.data as ReposCreateDeploymentResponseData)
      .id;

    core.info(`Deployment created with id ${deploymentId}`);
    core.info("Creating deployment status..");

    await client.repos.createDeploymentStatus({
      owner: owner,
      repo: repo,
      deployment_id: deploymentId,
      state: initialStatus,
      log_url: logUrl,
      environment_url: url,
    });

    core.setOutput("deployment_id", deploymentId.toString());
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

interface DeploymentResponse {
  id: string;
}

run();
