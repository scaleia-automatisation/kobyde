import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/agent/$name")({
  component: AgentRedirect,
});

function AgentRedirect() {
  const { name } = Route.useParams();
  return <Navigate to="/eric" search={{ agent: name }} />;
}
