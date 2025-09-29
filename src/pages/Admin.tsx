import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Key, Users, Copy, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InviteCode {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired';
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
  expiresAt?: string;
}

const Admin: React.FC = () => {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [newCodeData, setNewCodeData] = useState({
    code: '',
    expiresAt: '',
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockCodes: InviteCode[] = [
      {
        id: '1',
        code: 'GLIDER2024',
        status: 'active',
        createdAt: '2024-01-15T10:00:00Z',
        expiresAt: '2024-12-31T23:59:59Z',
      },
      {
        id: '2',
        code: 'EARLY_ACCESS',
        status: 'used',
        createdAt: '2024-01-10T09:00:00Z',
        usedAt: '2024-01-20T14:30:00Z',
        usedBy: '0x1234...5678',
      },
      {
        id: '3',
        code: 'BETA_TESTER',
        status: 'expired',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-31T23:59:59Z',
      },
    ];
    setInviteCodes(mockCodes);
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCode = () => {
    if (!newCodeData.code.trim()) {
      toast({
        title: "Error",
        description: "Please enter a code",
        variant: "destructive",
      });
      return;
    }

    const newCode: InviteCode = {
      id: Date.now().toString(),
      code: newCodeData.code.toUpperCase(),
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: newCodeData.expiresAt || undefined,
    };

    setInviteCodes(prev => [newCode, ...prev]);
    setNewCodeData({ code: '', expiresAt: '' });
    
    toast({
      title: "Success",
      description: "Invite code created successfully",
    });
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Copied",
        description: "Code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCode = (id: string) => {
    setInviteCodes(prev => prev.filter(code => code.id !== id));
    toast({
      title: "Success",
      description: "Invite code deleted",
    });
  };

  const getStatusBadge = (status: InviteCode['status']) => {
    const variants = {
      active: 'default',
      used: 'secondary',
      expired: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    total: inviteCodes.length,
    active: inviteCodes.filter(code => code.status === 'active').length,
    used: inviteCodes.filter(code => code.status === 'used').length,
    expired: inviteCodes.filter(code => code.status === 'expired').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage invite codes and access control</p>
        </div>
      </div>

      {/* Stats Cards */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="Enter custom code or generate random"
                      value={newCodeData.code}
                      onChange={(e) => setNewCodeData(prev => ({ ...prev, code: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setNewCodeData(prev => ({ ...prev, code: generateRandomCode() }))}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires">Expires At (Optional)</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={newCodeData.expiresAt}
                    onChange={(e) => setNewCodeData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleCreateCode} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Invite Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invite Codes</CardTitle>
              <CardDescription>
                Manage and monitor all invite codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inviteCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">
                        {code.code}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(code.status)}
                      </TableCell>
                      <TableCell>
                        {formatDate(code.createdAt)}
                      </TableCell>
                      <TableCell>
                        {code.expiresAt ? formatDate(code.expiresAt) : 'Never'}
                      </TableCell>
                      <TableCell>
                        {code.usedBy ? (
                          <span className="font-mono text-sm">{code.usedBy}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCode(code.id)}
                          >
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;