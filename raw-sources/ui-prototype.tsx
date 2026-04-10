import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockUserRequests, type UserRequest, type CompanyRole } from "@/lib/mock-data";
import { UserPlus, Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function UserRequestForm() {
  const { activeEntity, currentUser, isCompanySuperAdmin } = useAuth();
  const [requests, setRequests] = useState(mockUserRequests);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [remark, setRemark] = useState("");
  const [role, setRole] = useState<CompanyRole>("company_user");
  const [submitConfirm, setSubmitConfirm] = useState(false);

  if (!activeEntity || !currentUser) return null;

  const entityRequests = requests.filter(r => r.entity_id === activeEntity.id);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    const newRequest: UserRequest = {
      id: `req-${Date.now()}`,
      entity_id: activeEntity.id,
      requested_by: currentUser.id,
      name: name.trim(),
      email: email.trim(),
      role,
      remark: remark.trim(),
      status: "pending",
      reviewed_by: null,
      reject_reason: null,
      created_at: new Date().toISOString(),
      reviewed_at: null,
    };
    setRequests([newRequest, ...requests]);
    setDialogOpen(false);
    setName("");
    setEmail("");
    setRemark("");
    setRole("company_user");
    toast.success("User request submitted for bank approval");
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-3.5 w-3.5 text-warning" />;
      case "approved": return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      case "rejected": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return null;
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "pending": return "secondary" as const;
      case "approved": return "default" as const;
      case "rejected": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">User Requests</h1>
          <p className="text-sm text-muted-foreground">
            {isCompanySuperAdmin
              ? "Request new users for your company. Requests require bank approval."
              : "View user creation requests for " + activeEntity.name}
          </p>
        </div>
        {isCompanySuperAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" /> New User Request</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request New User</DialogTitle>
                <DialogDescription>
                  Submit a user creation request. It will be reviewed by the bank admin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>Requested Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as CompanyRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_user">Company User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Remarks / Justification</Label>
                  <Textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Provide context for this request (e.g., reason for access, department, urgency)"
                    rows={3}
                  />
                </div>
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">
                    This request will be sent to the Bank Admin for review. You'll be notified once a decision is made.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setSubmitConfirm(true)}
                  disabled={!name.trim() || !email.trim()}
                >
                  <Send className="h-4 w-4 mr-2" /> Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <p className="text-xs text-muted-foreground font-medium">Pending</p>
            </div>
            <p className="text-2xl font-bold font-display mt-1">{entityRequests.filter(r => r.status === "pending").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground font-medium">Approved</p>
            </div>
            <p className="text-2xl font-bold font-display mt-1">{entityRequests.filter(r => r.status === "approved").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground font-medium">Rejected</p>
            </div>
            <p className="text-2xl font-bold font-display mt-1">{entityRequests.filter(r => r.status === "rejected").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Request Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entityRequests.length === 0 ? (
                <TableRow>
                 <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No user requests yet
                  </TableCell>
                </TableRow>
              ) : (
                entityRequests.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{req.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {req.role === "company_user" ? "User" : "Super Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={req.remark}>
                      {req.remark || <span className="text-muted-foreground/50 italic">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(req.status)} className="text-[10px] capitalize gap-1">
                        {statusIcon(req.status)}
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {req.status === "rejected" && req.reject_reason && (
                        <span className="text-destructive text-xs">{req.reject_reason}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submit Confirmation */}
      <ConfirmDialog
        open={submitConfirm}
        onOpenChange={setSubmitConfirm}
        title="Submit User Request"
        description={`Submit a request to create "${name}" (${email}) as a Company User for ${activeEntity.name}? This will be sent to the bank admin for approval.`}
        confirmLabel="Submit Request"
        variant="default"
        onConfirm={() => {
          handleSubmit();
          setSubmitConfirm(false);
        }}
      />
    </div>
  );
}
