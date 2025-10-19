// app/jobs/new/page.tsx
import JobWizard from "@/components/forms/job-wizard";

export default function NewJobPage() {
  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <JobWizard />
      </div>
    </div>
  );
}
