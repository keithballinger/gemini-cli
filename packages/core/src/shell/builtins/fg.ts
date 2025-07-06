/**
 * fg - bring job to foreground
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class FgCommand implements BuiltinCommand {
  name = 'fg';
  description = 'Bring job to foreground';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    if (!options.enableJobControl) {
      console.error('fg: job control not enabled');
      return 1;
    }

    let jobId: number | undefined;

    if (args.length === 0) {
      // No arguments - use the current job
      const jobs = env.getAllJobs();
      const runningOrStopped = jobs.filter(j => j.status !== 'done');
      
      if (runningOrStopped.length === 0) {
        console.error('fg: no current job');
        return 1;
      }
      
      // Get the most recent job
      jobId = runningOrStopped[runningOrStopped.length - 1].id;
    } else {
      // Parse job specification
      const jobSpec = args[0];
      
      if (jobSpec.startsWith('%')) {
        // Job ID specified
        const id = parseInt(jobSpec.substring(1));
        if (isNaN(id)) {
          console.error(`fg: ${jobSpec}: no such job`);
          return 1;
        }
        jobId = id;
      } else {
        // Try to parse as job ID without %
        const id = parseInt(jobSpec);
        if (isNaN(id)) {
          console.error(`fg: ${jobSpec}: no such job`);
          return 1;
        }
        jobId = id;
      }
    }

    // Get the job
    const job = env.getJob(jobId);
    if (!job) {
      console.error(`fg: %${jobId}: no such job`);
      return 1;
    }

    if (job.status === 'done') {
      console.error(`fg: job has terminated`);
      return 1;
    }

    // Display the command being brought to foreground
    console.log(job.command);

    // TODO: Actually bring the job to foreground
    // This requires integration with the job control manager
    console.error('fg: job control not fully implemented');
    
    return 0;
  }

  help(): string {
    return `fg [job_spec]
Bring job to the foreground.

If JOB_SPEC is not present, the shell's notion of the current job is used.

Job specifications:
  %n    Job number n
  %%    Current job
  %+    Current job
  %-    Previous job`;
  }
}