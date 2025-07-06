/**
 * Job control management for the shell
 * Handles background processes, job suspension, and process groups
 */

import { ChildProcess } from 'child_process';
import * as process from 'process';
import { Job, ShellEnvironment } from './types.js';

export class JobControlManager {
  private jobs: Map<number, JobInfo> = new Map();
  private nextJobId: number = 1;
  private currentForegroundJob: number | null = null;

  constructor(private env: ShellEnvironment) {
    // Set up signal handlers for job control
    this.setupSignalHandlers();
  }

  /**
   * Create a new job
   */
  createJob(command: string, process: ChildProcess, background: boolean = false): Job {
    const job: Job = {
      id: this.nextJobId++,
      pid: process.pid!,
      command,
      status: 'running',
      background
    };

    const jobInfo: JobInfo = {
      job,
      process,
      pgid: process.pid!, // Process group ID
      startTime: Date.now()
    };

    this.jobs.set(job.id, jobInfo);

    // Set up process group for job control
    if (process.pid) {
      try {
        // Create new process group with the process as leader
        process.kill(-process.pid as any);
      } catch {
        // Process group creation failed, continue anyway
      }
    }

    // Monitor job status
    this.monitorJob(job.id);

    return job;
  }

  /**
   * Monitor a job for status changes
   */
  private monitorJob(jobId: number): void {
    const jobInfo = this.jobs.get(jobId);
    if (!jobInfo) return;

    const { process, job } = jobInfo;

    process.on('exit', (code, signal) => {
      job.status = 'done';
      job.exitCode = code ?? (signal ? 128 + this.getSignalNumber(signal) : 1);
      
      // Notify if this was a background job
      if (job.background) {
        console.log(`[${job.id}]+  Done                    ${job.command}`);
      }

      // Update environment
      this.env.updateJobStatus(job.id, 'done', job.exitCode);
    });

    process.on('error', (error) => {
      job.status = 'done';
      job.exitCode = 127;
      console.error(`Job ${job.id}: ${error.message}`);
      this.env.updateJobStatus(job.id, 'done', 127);
    });
  }

  /**
   * Bring a job to the foreground
   */
  async bringToForeground(jobId: number): Promise<number> {
    const jobInfo = this.jobs.get(jobId);
    if (!jobInfo) {
      throw new Error(`fg: job ${jobId} not found`);
    }

    const { job, process } = jobInfo;

    if (job.status === 'done') {
      throw new Error(`fg: job has terminated`);
    }

    // Update job status
    job.background = false;
    const wasStoppedBefore = job.status === 'stopped';
    job.status = 'running';
    this.currentForegroundJob = jobId;

    // Continue the job if it was stopped
    if (wasStoppedBefore) {
      process.kill('SIGCONT');
    }

    // Wait for job to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (job.status === 'done') {
          clearInterval(checkInterval);
          this.currentForegroundJob = null;
          resolve(job.exitCode || 0);
        }
      }, 100);
    });
  }

  /**
   * Send a job to the background
   */
  sendToBackground(jobId: number): void {
    const jobInfo = this.jobs.get(jobId);
    if (!jobInfo) {
      throw new Error(`bg: job ${jobId} not found`);
    }

    const { job, process } = jobInfo;

    if (job.status === 'done') {
      throw new Error(`bg: job has terminated`);
    }

    job.background = true;

    // Continue the job if it was stopped
    if (job.status === 'stopped') {
      job.status = 'running';
      process.kill('SIGCONT');
      console.log(`[${job.id}]+ ${job.command} &`);
    }
  }

  /**
   * List all jobs
   */
  listJobs(): Job[] {
    const jobs: Job[] = [];
    
    for (const [id, jobInfo] of this.jobs) {
      jobs.push({ ...jobInfo.job });
    }

    return jobs.sort((a, b) => a.id - b.id);
  }

  /**
   * Stop (suspend) a job
   */
  stopJob(jobId: number): void {
    const jobInfo = this.jobs.get(jobId);
    if (!jobInfo) return;

    const { job, process } = jobInfo;
    
    if (job.status === 'running') {
      job.status = 'stopped';
      process.kill('SIGTSTP');
      this.env.updateJobStatus(job.id, 'stopped');
    }
  }

  /**
   * Kill a job
   */
  killJob(jobId: number, signal: string = 'SIGTERM'): void {
    const jobInfo = this.jobs.get(jobId);
    if (!jobInfo) return;

    const { process } = jobInfo;
    process.kill(signal as any);
  }

  /**
   * Get job by ID
   */
  getJob(jobId: number): Job | undefined {
    const jobInfo = this.jobs.get(jobId);
    return jobInfo ? { ...jobInfo.job } : undefined;
  }

  /**
   * Get job by PID
   */
  getJobByPid(pid: number): Job | undefined {
    for (const [id, jobInfo] of this.jobs) {
      if (jobInfo.job.pid === pid) {
        return { ...jobInfo.job };
      }
    }
    return undefined;
  }

  /**
   * Clean up completed jobs
   */
  cleanupJobs(): void {
    const toRemove: number[] = [];
    
    for (const [id, jobInfo] of this.jobs) {
      if (jobInfo.job.status === 'done') {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.jobs.delete(id);
    }
  }

  /**
   * Set up signal handlers for job control
   */
  private setupSignalHandlers(): void {
    // Check if we're in a Node.js environment with signal support
    if (typeof process !== 'undefined' && typeof process.on === 'function') {
      // Handle Ctrl+Z (SIGTSTP)
      process.on('SIGTSTP', () => {
        if (this.currentForegroundJob !== null) {
          this.stopJob(this.currentForegroundJob);
          console.log('\n[Job stopped]');
        }
      });

      // Handle Ctrl+C (SIGINT)
      process.on('SIGINT', () => {
        if (this.currentForegroundJob !== null) {
          this.killJob(this.currentForegroundJob, 'SIGINT');
        }
      });
    }
    // In environments without signal support (like Ink), job control signals
    // need to be handled at a higher level or are not available
  }

  /**
   * Convert signal name to number
   */
  private getSignalNumber(signal: string): number {
    const signals: Record<string, number> = {
      'SIGHUP': 1,
      'SIGINT': 2,
      'SIGQUIT': 3,
      'SIGILL': 4,
      'SIGTRAP': 5,
      'SIGABRT': 6,
      'SIGBUS': 7,
      'SIGFPE': 8,
      'SIGKILL': 9,
      'SIGUSR1': 10,
      'SIGSEGV': 11,
      'SIGUSR2': 12,
      'SIGPIPE': 13,
      'SIGALRM': 14,
      'SIGTERM': 15,
      'SIGCHLD': 17,
      'SIGCONT': 18,
      'SIGSTOP': 19,
      'SIGTSTP': 20,
      'SIGTTIN': 21,
      'SIGTTOU': 22
    };
    
    return signals[signal] || 0;
  }

  /**
   * Wait for all background jobs to complete
   */
  async waitForAll(): Promise<void> {
    const backgroundJobs = Array.from(this.jobs.values())
      .filter(ji => ji.job.background && ji.job.status !== 'done');

    if (backgroundJobs.length === 0) return;

    console.log('Waiting for background jobs to complete...');
    
    await Promise.all(
      backgroundJobs.map(jobInfo => 
        new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (jobInfo.job.status === 'done') {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        })
      )
    );
  }
}

/**
 * Internal job information
 */
interface JobInfo {
  job: Job;
  process: ChildProcess;
  pgid: number; // Process group ID
  startTime: number;
}