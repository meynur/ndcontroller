import { useEffect, useMemo, useState, type FormEvent } from "react";

import { LoaderCircle, Save } from "lucide-react";

import type { QuickCommand, QuickCommandPayload } from "../../types/api";
import { Modal } from "../layout/Modal";

type QuickCommandFormModalProps = {
  open: boolean;
  command: QuickCommand | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: QuickCommandPayload) => Promise<void>;
};

const emptyForm: QuickCommandPayload = {
  name: "",
  command: "",
  description: "",
};

export function QuickCommandFormModal({
  open,
  command,
  loading,
  onClose,
  onSubmit,
}: QuickCommandFormModalProps) {
  const initialState = useMemo<QuickCommandPayload>(() => {
    if (!command) {
      return emptyForm;
    }

    return {
      name: command.name,
      command: command.command,
      description: command.description ?? "",
    };
  }, [command]);

  const [form, setForm] = useState<QuickCommandPayload>(initialState);

  useEffect(() => {
    setForm(initialState);
  }, [initialState, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      ...form,
      description: form.description?.trim() ? form.description : null,
    });
  }

  return (
    <Modal open={open} title={command ? "Редактировать быструю команду" : "Создать быструю команду"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">Название</span>
          <input
            className="glass-input"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Обновить пакеты"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">Команда</span>
          <textarea
            className="glass-input min-h-32 resize-y font-mono text-xs"
            value={form.command}
            onChange={(event) => setForm((current) => ({ ...current, command: event.target.value }))}
            placeholder="apt update && apt upgrade -y"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">Описание</span>
          <textarea
            className="glass-input min-h-24 resize-y"
            value={form.description ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Необязательная заметка о том, что делает команда"
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="glass-button">
            Отмена
          </button>
          <button type="submit" disabled={loading} className="glass-button bg-cyan-500/90 text-white hover:bg-cyan-500">
            {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Сохранить команду
          </button>
        </div>
      </form>
    </Modal>
  );
}
