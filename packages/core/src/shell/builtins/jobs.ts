/**
 * jobs - display status of jobs
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class JobsCommand implements BuiltinCommand {
  name = 'jobs';
  description = 'Display status of jobs';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    if (!options.enableJobControl) {
      console.error('jobs: job control not enabled');
      return 1;
    }

    const jobs = env.getAllJobs();
    
    if (jobs.length === 0) {
      // No jobs - silent return
      return 0;
    }

    // Parse options
    let showPids = false;
    let longFormat = false;
    
    for (const arg of args) {
      if (arg === '-l') {
        longFormat = true;
      } else if (arg === '-p') {
        showPids = true;
      } else if (arg.startsWith('-')) {
        console.error(`jobs: ${arg}: invalid option`);
        return 1;
      }
    }

    // Sort jobs by ID
    const sortedJobs = jobs.sort((a, b) => a.id - b.id);

    // Find the current and previous jobs
    const runningJobs = sortedJobs.filter(j => j.status === 'running');
    const currentJob = runningJobs[runningJobs.length - 1];
    const previousJob = runningJobs[runningJobs.length - 2];

    // Display each job
    for (const job of sortedJobs) {
      if (showPids) {
        // -p option: just show PIDs
        console.log(job.pid);
      } else {
        // Format: [job_id]+ status command
        let marker = ' ';
        if (job === currentJob) marker = '+';
        else if (job === previousJob) marker = '-';

        const status = this.formatStatus(job.status, job.exitCode);
        
        if (longFormat) {
          // -l option: include PID
          console.log(`[${job.id}]${marker} ${job.pid} ${status}\t${job.command}`);
        } else {
          console.log(`[${job.id}]${marker}  ${status}\t${job.command}`);
        }
      }
    }

    return 0;
  }

  private formatStatus(status: string, exitCode?: number): string {
    switch (status) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'done':
        return exitCode === 0 ? 'Done' : `Exit ${exitCode}`;
      default:
        return status;
    }
  }

  help(): string {
    return `jobs [-lp]
Display status of jobs.

Options:
  -l    List process IDs in addition to normal information
  -p    List process IDs only

The status of each job is displayed, along with its job number and command.
Jobs marked with + are the current job; jobs marked with - are the previous job.`;
  }
}