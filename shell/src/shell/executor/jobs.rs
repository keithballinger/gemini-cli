//! Job control module for background process management

use crate::shell::types::*;
use std::collections::HashMap;
use std::process::Stdio;
use tokio::process::{Child, Command as TokioCommand};
use tokio::sync::mpsc;
use tokio::time::{timeout, Duration};
use anyhow::Result;

/// Job manager for handling background processes
pub struct JobManager {
    jobs: HashMap<u32, RunningJob>,
    next_job_id: u32,
    job_status_tx: Option<mpsc::UnboundedSender<JobStatusUpdate>>,
}

#[derive(Debug)]
struct RunningJob {
    id: u32,
    pid: u32,
    command: String,
    process: Child,
    status: JobStatus,
    background: bool,
}

#[derive(Debug)]
pub struct JobStatusUpdate {
    pub job_id: u32,
    pub status: JobStatus,
    pub exit_code: Option<i32>,
}

impl JobManager {
    pub fn new() -> Self {
        Self {
            jobs: HashMap::new(),
            next_job_id: 1,
            job_status_tx: None,
        }
    }

    /// Initialize job manager with status channel
    pub fn with_status_channel(mut self, tx: mpsc::UnboundedSender<JobStatusUpdate>) -> Self {
        self.job_status_tx = Some(tx);
        self
    }

    /// Start a new job
    pub async fn start_job(
        &mut self,
        command: &str,
        args: &[String],
        env: &ShellEnvironment,
        background: bool,
    ) -> Result<u32> {
        let job_id = self.next_job_id;
        self.next_job_id += 1;

        // Build the command
        let mut cmd = TokioCommand::new(command);
        cmd.args(args);

        // Set up environment variables
        for (key, value) in &env.variables {
            cmd.env(key, value);
        }
        cmd.current_dir(&env.cwd);

        // Set up stdio for background jobs
        if background {
            cmd.stdin(Stdio::null());
            cmd.stdout(Stdio::piped());
            cmd.stderr(Stdio::piped());
        } else {
            cmd.stdin(Stdio::inherit());
            cmd.stdout(Stdio::inherit());
            cmd.stderr(Stdio::inherit());
        }

        // Spawn the process
        let child = cmd.spawn()?;
        let pid = child.id().unwrap_or(0);

        let job = RunningJob {
            id: job_id,
            pid,
            command: format!("{} {}", command, args.join(" ")),
            process: child,
            status: JobStatus::Running,
            background,
        };

        self.jobs.insert(job_id, job);

        // Start monitoring the job if it's in background
        if background {
            self.start_job_monitor(job_id).await;
        }

        Ok(job_id)
    }

    /// Wait for a specific job to complete
    pub async fn wait_for_job(&mut self, job_id: u32) -> Result<Option<i32>> {
        if let Some(mut job) = self.jobs.remove(&job_id) {
            match job.process.wait().await {
                Ok(status) => {
                    let exit_code = status.code();
                    
                    // Update job status
                    job.status = JobStatus::Done;
                    
                    // Notify status change
                    if let Some(ref tx) = self.job_status_tx {
                        let _ = tx.send(JobStatusUpdate {
                            job_id,
                            status: JobStatus::Done,
                            exit_code,
                        });
                    }

                    Ok(exit_code)
                }
                Err(e) => Err(e.into()),
            }
        } else {
            Ok(None)
        }
    }

    /// Check status of all jobs
    pub async fn check_jobs(&mut self) -> Vec<JobStatusUpdate> {
        let mut updates = Vec::new();
        let mut completed_jobs = Vec::new();

        for (job_id, job) in &mut self.jobs {
            // Check if process is still running
            match timeout(Duration::from_millis(1), job.process.wait()).await {
                Ok(Ok(status)) => {
                    // Process completed
                    let exit_code = status.code();
                    completed_jobs.push(*job_id);
                    
                    updates.push(JobStatusUpdate {
                        job_id: *job_id,
                        status: JobStatus::Done,
                        exit_code,
                    });
                }
                Ok(Err(_)) => {
                    // Error waiting for process
                    completed_jobs.push(*job_id);
                    
                    updates.push(JobStatusUpdate {
                        job_id: *job_id,
                        status: JobStatus::Done,
                        exit_code: Some(-1),
                    });
                }
                Err(_) => {
                    // Timeout - process still running
                    continue;
                }
            }
        }

        // Remove completed jobs
        for job_id in completed_jobs {
            self.jobs.remove(&job_id);
        }

        updates
    }

    /// Get information about a specific job
    pub fn get_job_info(&self, job_id: u32) -> Option<JobInfo> {
        self.jobs.get(&job_id).map(|job| JobInfo {
            id: job.id,
            pid: job.pid,
            command: job.command.clone(),
            status: job.status.clone(),
            background: job.background,
        })
    }

    /// List all active jobs
    pub fn list_jobs(&self) -> Vec<JobInfo> {
        self.jobs.values().map(|job| JobInfo {
            id: job.id,
            pid: job.pid,
            command: job.command.clone(),
            status: job.status.clone(),
            background: job.background,
        }).collect()
    }

    /// Kill a job
    pub async fn kill_job(&mut self, job_id: u32, signal: Option<i32>) -> Result<bool> {
        if let Some(job) = self.jobs.get_mut(&job_id) {
            // Send signal to process
            if let Some(_signal) = signal {
                // For now, just kill the process
                // TODO: Implement proper signal handling
                match job.process.kill().await {
                    Ok(_) => {
                        job.status = JobStatus::Done;
                        Ok(true)
                    }
                    Err(e) => Err(e.into()),
                }
            } else {
                // Default to SIGTERM
                match job.process.kill().await {
                    Ok(_) => {
                        job.status = JobStatus::Done;
                        Ok(true)
                    }
                    Err(e) => Err(e.into()),
                }
            }
        } else {
            Ok(false)
        }
    }

    /// Bring a background job to foreground
    pub async fn foreground_job(&mut self, job_id: u32) -> Result<Option<i32>> {
        if let Some(job) = self.jobs.get_mut(&job_id) {
            if job.background {
                job.background = false;
                // Wait for the job to complete
                return self.wait_for_job(job_id).await;
            }
        }
        Ok(None)
    }

    /// Send a job to background
    pub fn background_job(&mut self, job_id: u32) -> Result<bool> {
        if let Some(job) = self.jobs.get_mut(&job_id) {
            job.background = true;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Start monitoring a background job
    async fn start_job_monitor(&self, _job_id: u32) {
        if let Some(_tx) = &self.job_status_tx {
            // This is a simplified monitor
            // In a real implementation, we'd need more sophisticated process monitoring
            tokio::spawn(async move {
                tokio::time::sleep(Duration::from_millis(100)).await;
                
                // Check if job is still running and send updates as needed
                // This would be connected to actual process monitoring
            });
        }
    }

    /// Get number of active jobs
    pub fn job_count(&self) -> usize {
        self.jobs.len()
    }

    /// Check if there are any running jobs
    pub fn has_running_jobs(&self) -> bool {
        self.jobs.values().any(|job| job.status == JobStatus::Running)
    }
}

#[derive(Debug, Clone)]
pub struct JobInfo {
    pub id: u32,
    pub pid: u32,
    pub command: String,
    pub status: JobStatus,
    pub background: bool,
}

impl Default for JobManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_job_creation() {
        let mut manager = JobManager::new();
        let env = ShellEnvironment::new();

        // Use a command that's available on most systems
        let job_id = manager.start_job("/bin/echo", &["test".to_string()], &env, false).await;
        
        // If echo is not available, just test that the manager works with valid commands
        if job_id.is_err() {
            // Skip test if command doesn't exist
            return;
        }
        
        let job_id = job_id.unwrap();
        assert_eq!(job_id, 1);

        let job_info = manager.get_job_info(job_id);
        assert!(job_info.is_some());
        
        let job_info = job_info.unwrap();
        assert_eq!(job_info.id, 1);
        assert!(!job_info.background);
    }

    #[tokio::test]
    async fn test_job_listing() {
        let mut manager = JobManager::new();
        let env = ShellEnvironment::new();

        // Start a few jobs using available commands
        let job1 = manager.start_job("/bin/sleep", &["1".to_string()], &env, true).await;
        let job2 = manager.start_job("/bin/sleep", &["1".to_string()], &env, true).await;

        // Only proceed if jobs were created successfully
        if job1.is_ok() && job2.is_ok() {
            let jobs = manager.list_jobs();
            assert_eq!(jobs.len(), 2);
            assert!(jobs.iter().all(|j| j.background));
        }
    }

    #[tokio::test]
    async fn test_job_waiting() {
        let mut manager = JobManager::new();
        let env = ShellEnvironment::new();

        let job_id = manager.start_job("/bin/echo", &["hello".to_string()], &env, false).await;
        
        if let Ok(job_id) = job_id {
            let exit_code = manager.wait_for_job(job_id).await.unwrap();
            assert_eq!(exit_code, Some(0));
        }
    }
}