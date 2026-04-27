import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ClipboardCheck, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  getAllChecklistItems, addChecklistItem, updateChecklistItem,
  toggleChecklistItem, removeChecklistItem, reorderChecklistItem, subscribeChecklist
} from "@/lib/checklist-store";

export default function BankSettingsChecklist() {
  const [items, setItems] = useState(getAllChecklistItems());
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formText, setFormText] = useState("");

  useEffect(() => {
    const unsub = subscribeChecklist(() => setItems(getAllChecklistItems()));
    return unsub;
  }, []);

  const handleAdd = () => {
    if (!formText.trim()) return;
    addChecklistItem(formText.trim());
    toast({ title: "Checklist item added" });
    setFormText("");
    setAddOpen(false);
  };

  const handleUpdate = () => {
    if (!editId || !formText.trim()) return;
    updateChecklistItem(editId, formText.trim());
    toast({ title: "Checklist item updated" });
    setFormText("");
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    removeChecklistItem(id);
    toast({ title: "Checklist item removed" });
  };

  return (
    <div className="space-y-6" data-testid="checklist-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2" data-testid="checklist-title">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            LC Issuance Checklist
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="checklist-subtitle">Configure the verification checklist used by Branch and CTF during LC review</p>
        </div>
        <Button data-testid="btn-add-item" onClick={() => { setFormText(""); setAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <Card data-testid="checklist-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Checklist Items</CardTitle>
          <CardDescription>Items marked inactive will not appear in the review checklist</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table data-testid="checklist-table">
            <TableHeader>
              <TableRow data-testid="checklist-table-header">
                <TableHead className="w-16">S.N</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Order</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="checklist-table-body">
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8" data-testid="checklist-empty-state">No checklist items configured</TableCell>
                </TableRow>
              ) : items.map((item, idx) => (
                <TableRow key={item.id} data-testid={`checklist-row-${item.id}`}>
                  <TableCell className="font-medium" data-testid={`checklist-sn-${item.id}`}>{item.sn}</TableCell>
                  <TableCell className="text-sm" data-testid={`checklist-desc-${item.id}`}>{item.description}</TableCell>
                  <TableCell>
                    <Switch
                      data-testid={`checklist-toggle-${item.id}`}
                      checked={item.active}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} data-testid={`checklist-move-up-${item.id}`} onClick={() => reorderChecklistItem(item.id, "up")}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === items.length - 1} data-testid={`checklist-move-down-${item.id}`} onClick={() => reorderChecklistItem(item.id, "down")}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`checklist-edit-${item.id}`} onClick={() => { setEditId(item.id); setFormText(item.description); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" data-testid={`checklist-delete-${item.id}`} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent data-testid="dialog-add-item">
          <DialogHeader><DialogTitle>Add Checklist Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Description</Label>
            <Textarea data-testid="input-add-description" value={formText} onChange={e => setFormText(e.target.value)} placeholder="Enter checklist item description..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" data-testid="btn-add-cancel" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button data-testid="btn-add-confirm" onClick={handleAdd} disabled={!formText.trim()}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent data-testid="dialog-edit-item">
          <DialogHeader><DialogTitle>Edit Checklist Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Description</Label>
            <Textarea data-testid="input-edit-description" value={formText} onChange={e => setFormText(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" data-testid="btn-edit-cancel" onClick={() => setEditId(null)}>Cancel</Button>
            <Button data-testid="btn-edit-confirm" onClick={handleUpdate} disabled={!formText.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
