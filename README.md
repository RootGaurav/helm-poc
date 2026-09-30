# POC: Full App Onboarding Guide
## (Java Microservice + Node App — Jenkins → ECR → EKS via Helm)

---

## 📁 POC Directory Structure

```
poc/
├── java-service/                   ← Spring Boot app
│   ├── src/main/java/com/poc/
│   │   ├── PocApplication.java
│   │   └── controller/HealthController.java
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── build.gradle
│   ├── settings.gradle
│   └── Dockerfile                  ← Multi-stage build
│
├── node-app/                       ← Express.js app
│   ├── src/index.js
│   ├── package.json
│   ├── .env
│   ├── .dockerignore
│   └── Dockerfile                  ← Multi-stage build
│
├── helm/
│   ├── poc-java-service/           ← Helm chart (subscriber-event-service pattern)
│   │   ├── Chart.yaml
│   │   ├── values.yaml             ← Base values
│   │   ├── values-dev.yaml         ← DEV overrides
│   │   ├── values-uat.yaml         ← UAT overrides
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── serviceaccount.yaml
│   │       ├── ingress.yaml
│   │       └── hpa.yaml
│   │
│   └── poc-node-app/               ← Helm chart (frontend-web pattern)
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-dev.yaml
│       ├── values-uat.yaml
│       └── templates/
│           ├── deployment.yaml     ← Uses service.container_port (not containerInfo)
│           ├── service.yaml
│           ├── serviceaccount.yaml
│           ├── ingress.yaml
│           └── hpa.yaml
│
└── jenkins/
    └── Jenkinsfile                 ← Complete pipeline
```

---

## 🔑 Key Pattern Differences: Java vs Node

| | poc-java-service | poc-node-app |
|---|---|---|
| **Port in values** | `containerInfo.containerPort: 8080` | `service.container_port: 3000` |
| **Health URL** | `/poc-java-service/actuator/health` | `/actuator/health` |
| **Start delay** | `initialDelaySeconds: 60` (JVM slow) | `initialDelaySeconds: 15` |
| **Heap vars** | `MIN_HEAP`, `MAX_HEAP` in envVariables | N/A |
| **Volumes** | logs + creds-volume (CSI secrets) | logs only |
| **Sonar in pipeline** | `./gradlew clean test jacocoTestReport sonar` | nvm + npm ci + sonar-scanner |

---

## 🚀 Step-by-Step Setup

### Step 1: Create GitLab Repos

```bash
# Create 2 repos on gitlab.intelligrape.net:
# poc/poc-java-service
# poc/poc-node-app

# Push code:
cd java-service
git init && git remote add origin git@gitlab.intelligrape.net:poc/poc-java-service.git
git add . && git commit -m "init" && git push -u origin main

cd ../node-app
git init && git remote add origin git@gitlab.intelligrape.net:poc/poc-node-app.git
git add . && git commit -m "init" && git push -u origin main
```

### Step 2: Create ECR Repositories

```bash
aws ecr create-repository \
    --repository-name poc-java-service \
    --region ap-south-1

aws ecr create-repository \
    --repository-name poc-node-app \
    --region ap-south-1

# Verify:
aws ecr describe-repositories --region ap-south-1 | grep poc
```

### Step 3: Push Helm Charts to vr2-helm Repo

```bash
cd vr2-helm    # checkout vr-shared branch

# Copy helm folders
cp -r poc/helm/poc-java-service  ./poc-java-service/
cp -r poc/helm/poc-node-app      ./poc-node-app/

git add poc-java-service poc-node-app
git commit -m "feat: add poc-java-service and poc-node-app helm charts"
git push origin vr-shared
```

### Step 4: Update repo_url Map in Jenkinsfile

```groovy
// In your shared pipeline Jenkinsfile, add:
def repo_url = [
    // ... existing entries ...
    'poc-java-service' : 'git@gitlab.intelligrape.net:poc/poc-java-service.git',
    'poc-node-app'     : 'git@gitlab.intelligrape.net:poc/poc-node-app.git',
]
```

### Step 5: Add Dockerfile Switch Cases

```groovy
// In Building and Pushing Docker Image stage:
switch ("${app_name}") {
    // ... existing cases ...
    case 'poc-java-service':
        dockerfile = 'Dockerfile'
        break
    case 'poc-node-app':
        dockerfile = 'Dockerfile'
        break
}
```

### Step 6: Add to Quality Gate (if Sonar needed)

```groovy
stage("Quality gate") {
    when {
        expression {
            env.JOB_NAME.contains('vr-login-service') ||
            // ... existing ...
            env.JOB_NAME.contains('poc-java-service') ||  // ADD
            env.JOB_NAME.contains('poc-node-app')          // ADD
        }
    }
}
```

### Step 7: Create Jenkins Jobs

```
Job 1: vr-dev-poc-java-service
  Type: Pipeline
  Pipeline Definition: Pipeline script from SCM
  SCM: Git
  Repo URL: git@gitlab.intelligrape.net:poc/poc-java-service.git
  Branch: */main
  Script Path: Jenkinsfile   ← uses poc/jenkins/Jenkinsfile pattern

Job 2: vr-dev-poc-node-app
  Type: Pipeline
  Pipeline Definition: Pipeline script from SCM
  SCM: Git
  Repo URL: git@gitlab.intelligrape.net:poc/poc-node-app.git
  Branch: */main
  Script Path: Jenkinsfile
```

### Step 8: Ensure K8s Namespace Exists

```bash
kubectl get namespace dev
# Agar nahi hai:
kubectl create namespace dev

# Tolerations check — node pe label honi chahiye:
kubectl get nodes --show-labels | grep Environment
```

### Step 9: Run the Pipeline

```
Jenkins → vr-dev-poc-java-service → Build with Parameters
  branch_name: main
  sonar_enabled: false   ← pehli baar false rakho

Pipeline flow:
  git checkout → Build Docker → Push ECR → Checkout Helm → helm upgrade --install
```

---

## 🐛 Common Issues & Fixes

### Issue 1: `No git URL mapped for app_name`
```
# Job name galat hai. Check:
echo "vr-dev-poc-java-service" | cut -d '-' -f3-
# Output should be: poc-java-service
# Agar output alag hai, repo_url map ki key update karo
```

### Issue 2: ECR push fails
```bash
# ECR repo exist nahi karta:
aws ecr create-repository --repository-name poc-java-service --region ap-south-1

# IAM role check:
aws sts get-caller-identity
```

### Issue 3: Helm deploy fails — namespace not found
```bash
kubectl create namespace dev
# values-dev.yaml mein envName: dev hona chahiye
```

### Issue 4: Pod CrashLoopBackOff
```bash
kubectl logs -n dev deployment/poc-java-service
kubectl describe pod -n dev -l app=poc-java-service

# Aksar: health check URL galat hai ya app start hone mein zyada time lag raha
# Fix: initialDelaySeconds badhao values-dev.yaml mein
```

### Issue 5: Java Dockerfile — jar not found
```bash
# Ensure build.gradle has bootJar plugin (Spring Boot plugin)
# Check: build/libs/ mein kya hai
./gradlew bootJar --no-daemon
ls -la build/libs/
```

---

## ✅ Verification Commands

```bash
# 1. ECR image check
aws ecr list-images \
    --repository-name poc-java-service \
    --region ap-south-1

# 2. Helm release check
helm list -n dev

# 3. Pod status
kubectl get pods -n dev -l app=poc-java-service
kubectl get pods -n dev -l app=poc-node-app

# 4. Service check
kubectl get svc -n dev

# 5. Health check (port-forward for local testing)
kubectl port-forward -n dev svc/poc-java-service 8080:80
curl http://localhost:8080/poc-java-service/actuator/health

kubectl port-forward -n dev svc/poc-node-app 3000:80
curl http://localhost:3000/actuator/health

# 6. Rollback if needed
helm rollback poc-java-service -n dev
```
