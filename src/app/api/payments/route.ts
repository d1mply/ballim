import { NextRequest } from 'next/server';
import { GET as getHandler, POST as postHandler, PUT as putHandler, DELETE as deleteHandler } from '../odemeler/route';

export async function GET(req: NextRequest) { return getHandler(req); }
export async function POST(req: NextRequest) { return postHandler(req); }
export async function PUT(req: NextRequest) { return putHandler(req); }
export async function DELETE(req: NextRequest) { return deleteHandler(req); }
