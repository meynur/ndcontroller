import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { LoaderCircle, Save } from "lucide-react";

import type { NodeDetail, NodePayload } from "../../types/api";
import { Modal } from "../layout/Modal";

type NodeFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  node: NodeDetail | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: NodePayload) => Promise<void>;
};

const emptyForm: NodePayload = {
  name: "",
  host: "",
  port: 22,
  username: "",
  password: "",
  is_pinned: false,
  note: "",
};

export function NodeFormModal({ open, mode, node, loading, onClose, onSubmit }: NodeFormModalProps) {
  const initialState = useMemo<NodePayload>(() => {
    if (!node) {
      return emptyForm;
    }

    return {
      name: node.name,
      host: node.host,
      port: node.port,
      username: node.username,
      password: node.password,
      is_pinned: node.is_pinned,
      note: node.note ?? "",
    };
  }, [node]);

  const [form, setForm] = useState<NodePayload>(initialState);

  useEffect(() => {
    setForm(initialState);
  }, [initialState, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      ...form,
      note: form.note?.trim() ? form.note : null,
    });
  }

  return (
    <Modal open={open} title={mode === "create" ? "Добавить ноду" : "Редактировать ноду"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название">
            <input
              className="glass-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Production API"
              required
            />
          </Field>
          <Field label="IP / Хост">
            <input
              className="glass-input"
              value={form.host}
              onChange={(event) => setForm((current) => ({ ...current, host: event.target.value }))}
              placeholder="203.0.113.10"
              required
            />
          </Field>
          <Field label="Логин">
            <input
              className="glass-input"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              placeholder="root"
              required
            />
          </Field>
          <Field label="Порт">
            <input
              className="glass-input"
              type="number"
              min={1}
              max={65535}
              value={form.port}
              onChange={(event) => setForm((current) => ({ ...current, port: Number(event.target.value) || 22 }))}
              required
            />
          </Field>
        </div>

        <Field label="Пароль">
          <input
            className="glass-input"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Сохраняется для автоматического входа"
            required
          />
        </Field>

        <Field label="Заметка">
          <textarea
            className="glass-input min-h-28 resize-y"
            value={form.note ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Что запущено на сервере, детали деплоя, служебные пометки..."
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="glass-button">
            Отмена
          </button>
          <button type="submit" disabled={loading} className="glass-button bg-cyan-500/90 text-white hover:bg-cyan-500">
            {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {mode === "create" ? "Сохранить ноду" : "Обновить ноду"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
