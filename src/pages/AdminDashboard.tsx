import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Store, Shield, BarChart3, MapPin, Tag, Star,
  CheckCircle, XCircle, Clock, Eye, Heart, MessageSquare, TrendingUp
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { vendors } from '@/data/vendors';

const MOCK_PENDING_VENDORS = [
  { id: 'p1', name: 'BlueSky Laundry', type: 'Laundry Shop', neighborhood: 'Westlands', submittedAt: '2026-03-08', email: 'info@bluesky.co.ke' },
  { id: 'p2', name: 'FreshStart Cleaners', type: 'Dry Cleaner', neighborhood: 'Kilimani', submittedAt: '2026-03-09', email: 'hello@freshstart.co.ke' },
  { id: 'p3', name: 'QuickWash Express', type: 'Pickup & Delivery', neighborhood: 'South B', submittedAt: '2026-03-10', email: 'order@quickwash.co.ke' },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = {
    totalVendors: vendors.length,
    pendingApprovals: MOCK_PENDING_VENDORS.length,
    totalViews: vendors.reduce((a, v) => a + v.profileViews, 0),
    totalInquiries: vendors.reduce((a, v) => a + v.inquiries, 0),
    totalFavorites: vendors.reduce((a, v) => a + v.favorites, 0),
    avgRating: (vendors.reduce((a, v) => a + v.rating, 0) / vendors.length).toFixed(1),
    featuredCount: vendors.filter((v) => v.isFeatured).length,
    verifiedCount: vendors.filter((v) => v.isVerified).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage LaundryLink Nairobi</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="overview" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2"><Shield className="h-4 w-4" /> Approvals</TabsTrigger>
            <TabsTrigger value="vendors" className="gap-2"><Store className="h-4 w-4" /> Vendors</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total Vendors', value: stats.totalVendors, icon: Store, color: 'text-primary' },
                { label: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'text-warning' },
                { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye, color: 'text-cobalt' },
                { label: 'Total Inquiries', value: stats.totalInquiries.toLocaleString(), icon: MessageSquare, color: 'text-success' },
                { label: 'Total Favorites', value: stats.totalFavorites.toLocaleString(), icon: Heart, color: 'text-destructive' },
                { label: 'Avg Rating', value: stats.avgRating, icon: Star, color: 'text-warning' },
                { label: 'Featured Vendors', value: stats.featuredCount, icon: TrendingUp, color: 'text-cobalt' },
                { label: 'Verified Vendors', value: stats.verifiedCount, icon: CheckCircle, color: 'text-success' },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`rounded-lg bg-secondary p-2.5 ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent pending */}
            {MOCK_PENDING_VENDORS.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Shield className="h-5 w-5 text-warning" /> Pending Approvals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {MOCK_PENDING_VENDORS.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="font-medium text-foreground">{v.name}</p>
                          <p className="text-sm text-muted-foreground">{v.type} · {v.neighborhood} · {v.submittedAt}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1 bg-success hover:bg-success/90"><CheckCircle className="h-3.5 w-3.5" /> Approve</Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Vendor Approval Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {MOCK_PENDING_VENDORS.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-success" />
                    <p className="mt-3 font-medium text-foreground">All caught up!</p>
                    <p className="text-sm text-muted-foreground">No pending vendor approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {MOCK_PENDING_VENDORS.map((v) => (
                      <div key={v.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-display font-bold text-foreground">{v.name}</h3>
                            <p className="text-sm text-muted-foreground">{v.email}</p>
                            <div className="mt-2 flex gap-2">
                              <Badge variant="secondary">{v.type}</Badge>
                              <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" /> {v.neighborhood}</Badge>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-warning">
                            <Clock className="mr-1 h-3 w-3" /> Submitted {v.submittedAt}
                          </Badge>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" className="gap-1 bg-success hover:bg-success/90"><CheckCircle className="h-3.5 w-3.5" /> Approve</Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                          <Button size="sm" variant="ghost">View Details</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display">All Vendors</CardTitle>
                <Badge variant="secondary">{vendors.length} vendors</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vendors.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${
                          v.availability === 'accepting' ? 'bg-success' : v.availability === 'limited' ? 'bg-warning' : 'bg-destructive'
                        }`} />
                        <div>
                          <p className="font-medium text-foreground">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.typeLabel} · {v.neighborhood}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {v.profileViews}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {v.favorites}</span>
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {v.rating}</span>
                        <div className="flex gap-1">
                          {v.isVerified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                          {v.isFeatured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                        </div>
                        <Link to={`/vendor/${v.slug}`}>
                          <Button size="sm" variant="ghost">View</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Top Vendors by Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...vendors].sort((a, b) => b.profileViews - a.profileViews).slice(0, 10).map((v, i) => (
                      <div key={v.id} className="flex items-center gap-3">
                        <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{v.name}</p>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(v.profileViews / vendors[0].profileViews) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-foreground">{v.profileViews.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Top Vendors by Inquiries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...vendors].sort((a, b) => b.inquiries - a.inquiries).slice(0, 10).map((v, i) => (
                      <div key={v.id} className="flex items-center gap-3">
                        <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{v.name}</p>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${(v.inquiries / Math.max(...vendors.map(x => x.inquiries))) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-foreground">{v.inquiries.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Vendors by Neighborhood</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(
                      vendors.reduce((acc, v) => {
                        acc[v.neighborhood] = (acc[v.neighborhood] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="text-sm font-medium text-foreground">{name}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Vendor Types Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(
                      vendors.reduce((acc, v) => {
                        acc[v.typeLabel] = (acc[v.typeLabel] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="text-sm font-medium text-foreground">{type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
