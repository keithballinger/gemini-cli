/**
 * bg - resume job in background
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class BgCommand implements BuiltinCommand {
  name = 'bg';
  description = 'Resume job in background';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    if (!options.enableJobControl) {
      console.error('bg: job control not enabled');
      return 1;
    }

    let jobId: number | undefined;

    if (args.length === 0) {
      // No arguments - use the current stopped job
      const jobs = env.getAllJobs();
      const stoppedJobs = jobs.filter(j => j.status === 'stopped');
      
      if (stoppedJobs.length === 0) {
        console.error('bg: no stopped jobs');
        return 1;
      }
      
      // Get the most recent stopped job
      jobId = stoppedJobs[stoppedJobs.length - 1].id;
    } else {
      // Parse job specification
      const jobSpec = args[0];
      
      if (jobSpec.startsWith('%')) {
        // Job ID specified
        const id = parseInt(jobSpec.substring(1));
        if (isNaN(id)) {
          console.error(`bg: ${jobSpec}: no such job`);
          return 1;
        }
        jobId = id;
      } else {
        // Try to parse as job ID without %
        const id = parseInt(jobSpec);
        if (isNaN(id)) {
          console.error(`bg: ${jobSpec}: no such job`);
          return 1;
        }
        jobId = id;
      }
    }

    // Get the job
    const job = env.getJob(jobId);
    if (!job) {
      console.error(`bg: %${jobId}: no such job`);
      return 1;
    }

    if (job.status === 'done') {
      console.error(`bg: job has terminated`);
      return 1;
    }

    if (job.status !== 'stopped') {
      console.error(`bg: job ${jobId} already in background`);
      return 0;
    }

    // Display the job being resumed
    console.log(`[${job.id}]+ ${job.command} &`);

    // TODO: Actually resume the job in background
    // This requires integration with the job control manager
    console.error('bg: job control not fully implemented');
    
    return 0;
  }

  help(): string {
    return `bg [job_spec]
Resume a stopped job in the background.

If JOB_SPEC is not present, the shell's notion of the current job is used.

Job specifications:
  %n    Job number n
  %%    Current job
  %+    Current job
  %-    Previous job`;
  }
}