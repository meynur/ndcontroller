from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_ssh_service
from app.db.session import get_db_session
from app.schemas.node import (
    CommandExecutionResponse,
    NodeCommandRequest,
    NodeCreate,
    NodeDetail,
    NodeSummary,
    NodeUpdate,
)
from app.services.node_service import NodeService
from app.services.ssh_service import SSHService


router = APIRouter(prefix="/nodes", tags=["nodes"])


@router.get("", response_model=list[NodeSummary])
async def list_nodes(session: AsyncSession = Depends(get_db_session)) -> list[NodeSummary]:
    return await NodeService.list_nodes(session)


@router.post("", response_model=NodeDetail, status_code=status.HTTP_201_CREATED)
async def create_node(
    payload: NodeCreate,
    session: AsyncSession = Depends(get_db_session),
) -> NodeDetail:
    return await NodeService.create_node(session, payload)


@router.get("/{node_id}", response_model=NodeDetail)
async def get_node(node_id: int, session: AsyncSession = Depends(get_db_session)) -> NodeDetail:
    node = await NodeService.get_node_detail(session, node_id)
    if node is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    return node


@router.put("/{node_id}", response_model=NodeDetail)
async def update_node(
    node_id: int,
    payload: NodeUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> NodeDetail:
    node = await NodeService.update_node(session, node_id, payload)
    if node is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    return node


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(node_id: int, session: AsyncSession = Depends(get_db_session)) -> None:
    deleted = await NodeService.delete_node(session, node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")


@router.post("/{node_id}/execute", response_model=CommandExecutionResponse)
async def execute_command(
    node_id: int,
    payload: NodeCommandRequest,
    session: AsyncSession = Depends(get_db_session),
    ssh_service: SSHService = Depends(get_ssh_service),
) -> CommandExecutionResponse:
    node = await NodeService.get_node_model(session, node_id)
    if node is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    result = await ssh_service.run_command(node=node, command=payload.command)
    return CommandExecutionResponse(
        node_id=node.id,
        command=payload.command,
        exit_code=result.exit_code,
        stdout=result.stdout,
        stderr=result.stderr,
        success=result.success,
    )
