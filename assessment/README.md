# DevOps Assessment - Toy Production System

This repository contains the source code for a microservices-based "Toy Production" system.
**Your goal is to become the Platform Engineer for this system.**

## Application Overview

The system consists of 3 microservices and 2 backing services:

1.  **User Service** (Node.js): Manages user data.
2.  **Product Service** (Node.js): Manages product catalog (backed by Postgres + Redis).
3.  **Order Service** (Node.js): Processes orders by communicating with User and Product services.
4.  **Postgres**: Relational database (single schema per service logic).
5.  **Redis**: Cache for the Product Service.

## Prerequisites
-   Docker & Docker Compose
-   Node.js 20+ (optional, for local run without docker)

## Helper Scripts & Local Development

We provide a `scripts/` folder with tools to help you build and test.

| Script | Purpose |
| :--- | :--- |
| `scripts/local-dev.sh` | **Start Button**. Runs `docker compose up --build` to start the full stack locally. |
| `scripts/acceptance.sh` | **Test Suite**. Validates health checks and creates an order. Use this to verify your deployment. |
| `scripts/seed.sh` | **Reset Button**. Wipes and re-seeds the database if you get into a bad state. |
| `scripts/init.sql` | **Database Schema**. The SQL file used to create tables and insert initial data (runs automatically). |

### Running Locally

```bash
# Start all services
./scripts/local-dev.sh

# Run acceptance checks
./scripts/acceptance.sh
```

### Seeding Data
The database is automatically seeded via `init.sql` on the first startup. To reset it manually:
```bash
./scripts/seed.sh
```

## Candidate Instructions (What You Must Do)

### 1. Understand the goal
Your job is to take the provided microservices application and make it run reliably on AWS using production-style infrastructure and practices. You will provision infrastructure, deploy the services, expose them externally, set up CI/CD, and add observability. Then you will participate in a live “game day” where incidents will be triggered and you will debug and recover the system.

### 2. What you are given
**Application source code for:**
*   `user-service`
*   `product-service`
*   `order-service`

**Files:**
*   Dockerfiles for each service
*   Local `docker-compose` for development sanity (optional for you to use)
*   DB migrations + seed data
*   Acceptance script that verifies core functionality

**NOT Given:**
*   You are NOT given any AWS infrastructure, Kubernetes manifests, Helm charts, Istio configs, or CI/CD pipelines. Creating these is part of the assessment.

### 3. Infrastructure you must provision in AWS (IaC required)
Use Terraform (preferred) or another IaC tool.

**Required resources:**
*   **Networking**: Create a VPC with public and private subnets (multi-AZ preferred). Routing, NAT, and security groups required to run EKS and access DB/cache safely.
*   **Compute / Kubernetes**:
    *   Create an EKS cluster.
    *   Create a node group (managed node group is fine).
    *   Configure cluster access so you can deploy workloads.
*   **Container registry**: Create ECR repositories (one per service or one shared repo approach).
*   **Data layer** (choose one approach and justify):
    *   Postgres: RDS Postgres (Recommended) OR Postgres running in the cluster (StatefulSet).
    *   Redis: ElastiCache Redis (Recommended) OR Redis running in the cluster.
*   **IAM and access**:
    *   Use best-practice IAM (least privilege).
    *   Do not hardcode AWS keys in the cluster.
    *   If you use IRSA, document how it works.

### 4. Build and deploy the application to EKS
You must create the Kubernetes deployment configuration yourself.

**Minimum requirements per service:**
*   **Deployment**, **Service** resources.
*   **Liveness probe** hitting `/health`.
*   **Readiness probe** hitting `/ready`.
*   **Resource requests and limits**.
*   **Config** via environment variables (do not hardcode).
*   **Secrets** must be handled safely (see Security section).

You must also apply database migrations and seed data in the deployed environment (your approach is up to you, but document it).

### 5. Expose the services externally (routing required)
All services must be reachable from outside the cluster through a proper ingress layer.

**Requirements:**
*   Use an AWS Load Balancer ingress path (ALB recommended).
*   Provide a clean routing strategy: host-based routing (recommended) OR path-based routing.
*   External access must allow the acceptance script to run against your ingress endpoint(s).

**Service endpoints that must be reachable:**
*   `GET /users/:id`
*   `GET /products/:id`
*   `POST /orders`

**Optional:** You may use Istio OR AWS API Gateway as an additional routing/control layer.
*   If you use Istio: configure ingress gateway + routing rules.
*   If you use API Gateway: document integration and routing.
*   Pick one approach and justify.

### 6. CI/CD pipeline (required)
Set up a pipeline that triggers on push to main (or merge to main) and performs:
1.  Build Docker images for all services.
2.  Push images to ECR.
3.  Deploy to EKS.
4.  Support rollback (document how rollback works).

You can use GitHub Actions, GitLab CI, or another CI system. The key requirement is that a code push results in a reproducible deployment.

### 7. Observability (required)
You must implement logging and monitoring so the system is operable.

**Logging:**
*   Centralize container logs (CloudWatch is fine).

**Dashboards (minimum 1–2):**
Must include at least:
*   Request latency and error rate for each service.
*   Pod restarts / resource usage.
*   DB connectivity or DB errors (at least via logs/metrics).

**Alerts (minimum 2):**
Examples (pick at least two):
*   Order-service latency above threshold.
*   5xx rate above threshold.
*   Pod crashloop / restarts above threshold.
*   DB connection/auth failures detected.

### 8. Operational documentation (required)
Provide a short runbook that includes:
*   How to deploy.
*   How to rollback.
*   What you check first during an incident (logs/metrics/routing/DB).
*   Where dashboards and alerts live.

### 9. Deliverables
You must submit:
*   A PR (or branch) containing your IaC, deployment configs, and CI/CD pipeline.
*   The endpoint(s) to run the acceptance script against.
*   Proof of observability: dashboard link/screenshots, alert configuration or screenshots.
*   Runbook (short).
*   Postmortems (after game day incidents).

### 10. Rules / constraints
*   Keep costs low (use small instances and avoid unnecessary scaling).
*   Do not expose the database publicly.
*   Do not commit secrets into git.
*   Prefer least privilege IAM.
*   Prefer reproducible automation over manual clicking.
