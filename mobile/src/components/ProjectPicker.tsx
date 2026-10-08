import React, { useState } from "react";
import { Button, Field, Sheet, Skeleton, ErrorBox, Empty } from "./UI";
import { usePaged, useDebounced } from "../hooks/useData";
import type { Row } from "../types";
export function ProjectPicker({
  value,
  onChange,
  allowAll = false,
  disabled = false,
}: {
  value: Row | null;
  onChange: (project: Row | null) => void;
  allowAll?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const list = usePaged(open ? "/projects" : null, {
    search: debounced,
    sortBy: "name",
    sortOrder: "ASC",
  });
  return (
    <>
      <Button
        title={
          "Project: " +
          (value?.name || (allowAll ? "All projects" : "Select project"))
        }
        variant="secondary"
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <Sheet title="Choose project" open={open} onClose={() => setOpen(false)}>
        <Field
          label="Search projects"
          value={search}
          onChangeText={setSearch}
        />
        {allowAll && (
          <Button
            title="All projects"
            variant="secondary"
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        )}
        {list.error && <ErrorBox message={list.error} retry={list.refresh} />}
        {list.rows.map((p) => (
          <Button
            key={p.id}
            title={p.name}
            variant="secondary"
            onPress={() => {
              onChange(p);
              setOpen(false);
            }}
          />
        ))}
        {list.loading && <Skeleton count={1} />}
        {!list.loading && !list.rows.length && !list.error && (
          <Empty
            title="No projects found"
            detail="Ask a project manager to add you to a project, or change your search."
          />
        )}
        {list.hasMore && (
          <Button
            title="Load more projects"
            busy={list.loading}
            variant="secondary"
            onPress={list.more}
          />
        )}
      </Sheet>
    </>
  );
}
