import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Key, Users, Copy, Check, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userService, InviteCode as ApiInviteCode } from "@/services/userService";
import type { AccessRequest } from "@/services/userService";
import { useAccount } from "wagmi";
import { formatAddress } from "@/lib/utils";

interface InviteCode {
  id: string;
  code: string;
  status: "active" | "used" | "expired";
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
  expiresAt?: string;
  assignKolRole?: boolean;
  createdBy?: string;
  redeemableCredits?: number;
  redeemedBy?: string;
  redeemedByPrivyId?: string;
}

const convertApiInviteCode = (apiCode: ApiInviteCode): InviteCode => {
  const now = new Date();
  const expiresAt = new Date(apiCode.expires_at);

  let status: "active" | "used" | "expired" = "active";
  if (apiCode.status === "used") {
    status = "used";
  } else if (expiresAt < now) {
    status = "expired";
  }

  return {
    id: apiCode.id.toString(),
    code: apiCode.code,
    status,
    createdAt: apiCode.created_at,
    expiresAt: apiCode.expires_at,
    assignKolRole: apiCode.assign_kol_role,
    createdBy: apiCode.created_by_privy_id,
    redeemableCredits: apiCode.redeemable_credits,
    usedAt: apiCode.redeemed_at || undefined,
    redeemedBy: apiCode.redeemed_by?.toString() || undefined,
    redeemedByPrivyId: apiCode.redeemed_by_privy_id || undefined,
  };
};

const Admin: React.FC = () => {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [newCodeData, setNewCodeData] = useState({
    expiresAt: "",
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { address: userAddress } = useAccount();
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [requestsSort, setRequestsSort] = useState<{
    key: keyof AccessRequest;
    dir: "asc" | "desc";
  } | null>(null);

  const fetchInviteCodes = async () => {
    if (!userAddress) return;

    setIsLoading(true);
    try {
      const apiCodes = await userService.getInviteCodes(userAddress);
      console.log("apiCodes", apiCodes);
      const convertedCodes = apiCodes.map(convertApiInviteCode);
      setInviteCodes(convertedCodes);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invite codes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInviteCodes();
    const fetchAccessRequests = async () => {
      if (!userAddress) return;
      try {
        const reqs = await userService.getAccessRequests(userAddress);
        console.log("accessRequests", reqs);
        setAccessRequests(reqs || []);
      } catch (error) {
        console.error("Error fetching access requests:", error);
      }
    };
    fetchAccessRequests();
  }, [userAddress]);

  const sortBy = (key: keyof AccessRequest) => {
    setRequestsSort((prev) => {
      const dir =
        prev && prev.key === key && prev.dir === "asc" ? "desc" : "asc";
      return { key, dir };
    });
  };

  const sortedAccessRequests = (() => {
    if (!requestsSort) return accessRequests;
    const { key, dir } = requestsSort;
    const arr = [...accessRequests];
    arr.sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va == null && vb == null) return 0;
      if (va == null) return dir === "asc" ? -1 : 1;
      if (vb == null) return dir === "asc" ? 1 : -1;
      // Numeric vs string vs date
      if (typeof va === "number" && typeof vb === "number") {
        return dir === "asc" ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return arr;
  })();

  const handleCreateCode = async () => {
    if (!userAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet to create invite codes",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      await userService.createInviteCode(
        newCodeData.expiresAt || "",
        userAddress
      );

      toast({
        title: "Success",
        description: "Invite code created successfully",
      });

      await fetchInviteCodes();

      setNewCodeData({
        expiresAt: "",
        // assignKolRole: true,
      });
    } catch (error) {
      console.error("Error creating invite code:", error);
      toast({
        title: "Error",
        description: "Failed to create invite code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Copied",
        description: "Copied successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: InviteCode["status"]) => {
    const variants = {
      active: "default",
      used: "secondary",
      expired: "destructive",
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = {
    total: inviteCodes.length,
    active: inviteCodes.filter((code) => code.status === "active").length,
    used: inviteCodes.filter((code) => code.status === "used").length,
    expired: inviteCodes.filter((code) => code.status === "expired").length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e4dfcb]">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage invite codes and access control
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.used}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <div className="h-2 w-2 bg-red-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes">Invite Codes</TabsTrigger>
          <TabsTrigger value="create">Create Code</TabsTrigger>
          <TabsTrigger value="access-requests">Access Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Invite Code</CardTitle>
              <CardDescription>
                Generate a new invite code for platform access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-80">
                <Label htmlFor="expires">Expires At</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={newCodeData.expiresAt}
                  onChange={(e) =>
                    setNewCodeData((prev) => ({
                      ...prev,
                      expiresAt: e.target.value,
                    }))
                  }
                  onClick={(e) => {
                    const input = e.target as HTMLInputElement;
                    input.showPicker();
                  }}
                />
              </div>

              <Button
                onClick={handleCreateCode}
                className="w-full md:w-auto"
                disabled={isCreating}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? "Creating..." : "Create Invite Code"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invite Codes</CardTitle>
                  <CardDescription>
                    Manage and monitor all invite codes
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchInviteCodes}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Used By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading invite codes...
                      </TableCell>
                    </TableRow>
                  ) : inviteCodes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No invite codes found. Create your first invite code
                        above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inviteCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-medium">
                          <div className="flex gap-2 items-center">
                            {code.code}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyCode(code.code)}
                            >
                              {copiedCode === code.code ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(code.status)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {code.redeemableCredits || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(code.createdAt)}</TableCell>
                        <TableCell>
                          {code.expiresAt
                            ? formatDate(code.expiresAt)
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          {code.redeemedBy ? (
                            <span className="text-sm">
                              {code.redeemedByPrivyId
                                ? `${code.redeemedByPrivyId.slice(
                                    0,
                                    6
                                  )}...${code.redeemedByPrivyId.slice(-4)}`
                                : `User ${code.redeemedBy}`}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Access Requests</CardTitle>
                  <CardDescription>
                    View and manage user access requests
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!userAddress) return;
                    try {
                      const reqs = await userService.getAccessRequests(
                        userAddress
                      );
                      setAccessRequests(reqs || []);
                    } catch (error) {
                      console.error("Error refreshing access requests:", error);
                      toast({
                        title: "Error",
                        description: "Failed to refresh access requests",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      onClick={() => sortBy("id")}
                      className="cursor-pointer"
                    >
                      ID
                    </TableHead>
                    <TableHead
                      onClick={() => sortBy("wallet_address")}
                      className="cursor-pointer"
                    >
                      Wallet Address
                    </TableHead>
                    <TableHead
                      onClick={() => sortBy("twitter_handle")}
                      className="cursor-pointer"
                    >
                      Twitter Handle
                    </TableHead>
                    <TableHead
                      onClick={() => sortBy("status_display")}
                      className="cursor-pointer"
                    >
                      Status
                    </TableHead>
                    <TableHead
                      onClick={() => sortBy("created_at")}
                      className="cursor-pointer"
                    >
                      Created At
                    </TableHead>
                    <TableHead
                      onClick={() => sortBy("updated_at")}
                      className="cursor-pointer"
                    >
                      Updated At
                    </TableHead>
                    <TableHead
                      onClick={() => sortBy("processed_at")}
                      className="cursor-pointer"
                    >
                      Processed At
                    </TableHead>
                    <TableHead
                      onClick={() => sortBy("notes")}
                      className="cursor-pointer"
                    >
                      Notes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAccessRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No access requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAccessRequests.map((req) => (
                      <TableRow
                        key={`${req.id}-${req.wallet_address}-${req.created_at}`}
                      >
                        <TableCell>{req.id ?? "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center">
                            {formatAddress(req.wallet_address) ?? "-"}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyCode(req.wallet_address)}
                            >
                              {copiedCode === req.wallet_address ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {req.twitter_handle ?? "-"}{" "}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyCode(req.twitter_handle)}
                          >
                            {copiedCode === req.twitter_handle ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {req.status_display ?? req.status ?? "-"}
                        </TableCell>
                        <TableCell>{formatDate(req.created_at)}</TableCell>
                        <TableCell>{formatDate(req.updated_at)}</TableCell>
                        <TableCell>{formatDate(req.processed_at)}</TableCell>
                        <TableCell>{req.notes ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;