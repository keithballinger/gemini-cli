//! jobs - list active jobs builtin command

use crate::shell::types::*;

pub struct JobsCommand;

#[async_trait::async_trait]
impl BuiltinCommand for JobsCommand {
    fn name(&self) -> &str {
        "jobs"
    }

    fn description(&self) -> &str {
        "Display status of jobs in current session"
    }

    async fn execute(
        &self,
        args: &[String],
        env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        let mut show_pids = false;
        let mut show_running_only = false;

        // Parse arguments
        for arg in args {
            match arg.as_str() {
                "-l" => show_pids = true,
                "-r" => show_running_only = true,
                "-h" | "--help" => {
                    println!("{}", self.help());
                    return Ok(0);
                }
                _ if arg.starts_with('-') => {
                    eprintln!("jobs: {}: invalid option", arg);
                    return Ok(1);
                }
                _ => {
                    // Job ID specified - show specific job
                    if let Ok(job_id) = arg.parse::<u32>() {
                        if let Some(job) = env.get_job(job_id) {
                            print_job(job, show_pids);
                        } else {
                            eprintln!("jobs: {}: no such job", job_id);
                            return Ok(1);
                        }
                        return Ok(0);
                    } else {
                        eprintln!("jobs: {}: arguments must be job IDs", arg);
                        return Ok(1);
                    }
                }
            }
        }

        // List all jobs
        let jobs = env.get_all_jobs();
        let mut displayed = 0;

        for job in jobs {
            if show_running_only && job.status != JobStatus::Running {
                continue;
            }
            
            print_job(job, show_pids);
            displayed += 1;
        }

        if displayed == 0 && args.is_empty() {
            // No jobs to display, which is normal
        }

        Ok(0)
    }

    fn help(&self) -> String {
        "jobs [-l] [-r] [job_id ...]
Display status of jobs in the current session.

Options:
  -l    List process IDs in addition to the normal information
  -r    Display only running jobs

Arguments:
  job_id    Display information about specific job(s)

Job status indicators:
  Running   Job is currently executing
  Stopped   Job has been suspended
  Done      Job has completed

Examples:
  jobs          List all jobs
  jobs -l       List all jobs with process IDs
  jobs -r       List only running jobs
  jobs 1 2      Show details for jobs 1 and 2".to_string()
    }
}

fn print_job(job: &Job, show_pids: bool) {
    let status_char = match job.status {
        JobStatus::Running => "+",
        JobStatus::Stopped => "-",
        JobStatus::Done => " ",
    };

    let background_char = if job.background { "&" } else { "" };

    if show_pids {
        println!(
            "[{}]{} {} {} {}{}",
            job.id,
            status_char,
            job.pid,
            format!("{:?}", job.status).to_lowercase(),
            job.command,
            background_char
        );
    } else {
        println!(
            "[{}]{} {} {}{}",
            job.id,
            status_char,
            format!("{:?}", job.status).to_lowercase(),
            job.command,
            background_char
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_jobs_no_jobs() {
        let mut env = ShellEnvironment::new();
        let jobs = JobsCommand;
        
        let result = jobs.execute(&[], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_jobs_with_jobs() {
        let mut env = ShellEnvironment::new();
        
        // Add a test job
        let job = env.create_job("test command".to_string(), 123, true);
        assert_eq!(job.id, 1);

        let jobs = JobsCommand;
        let result = jobs.execute(&[], &mut env, &ShellOptions::default()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_jobs_help() {
        let mut env = ShellEnvironment::new();
        let jobs = JobsCommand;
        
        let result = jobs.execute(&["-h".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_jobs_invalid_option() {
        let mut env = ShellEnvironment::new();
        let jobs = JobsCommand;
        
        let result = jobs.execute(&["-x".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_jobs_specific_job() {
        let mut env = ShellEnvironment::new();
        
        // Add a test job
        env.create_job("test command".to_string(), 123, true);

        let jobs = JobsCommand;
        
        // Test valid job ID
        let result = jobs.execute(&["1".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        
        // Test invalid job ID
        let result = jobs.execute(&["999".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
    }
}