from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt_secret, encrypt_secret
from app.models.node import Node
from app.schemas.node import NodeCreate, NodeDetail, NodeSummary, NodeUpdate


class NodeService:
    @staticmethod
    async def list_nodes(session: AsyncSession) -> list[NodeSummary]:
        result = await session.execute(
            select(Node).order_by(Node.is_pinned.desc(), Node.created_at.desc(), Node.id.desc())
        )
        nodes = result.scalars().all()
        return [NodeService._to_summary(node) for node in nodes]

    @staticmethod
    async def create_node(session: AsyncSession, payload: NodeCreate) -> NodeDetail:
        node = Node(
            name=payload.name,
            host=payload.host,
            port=payload.port,
            username=payload.username,
            is_pinned=payload.is_pinned,
            password_encrypted=encrypt_secret(payload.password),
            note=payload.note,
        )
        session.add(node)
        await session.commit()
        await session.refresh(node)
        return NodeService._to_detail(node)

    @staticmethod
    async def get_node_detail(session: AsyncSession, node_id: int) -> NodeDetail | None:
        node = await session.get(Node, node_id)
        if node is None:
            return None
        return NodeService._to_detail(node)

    @staticmethod
    async def get_node_model(session: AsyncSession, node_id: int) -> Node | None:
        return await session.get(Node, node_id)

    @staticmethod
    async def update_node(
        session: AsyncSession,
        node_id: int,
        payload: NodeUpdate,
    ) -> NodeDetail | None:
        node = await session.get(Node, node_id)
        if node is None:
            return None

        changes = payload.model_dump(exclude_unset=True)

        if "password" in changes:
            raw_password = changes.pop("password")
            if raw_password is not None:
                node.password_encrypted = encrypt_secret(raw_password)

        for field, value in changes.items():
            setattr(node, field, value)

        await session.commit()
        await session.refresh(node)
        return NodeService._to_detail(node)

    @staticmethod
    async def delete_node(session: AsyncSession, node_id: int) -> bool:
        node = await session.get(Node, node_id)
        if node is None:
            return False

        await session.delete(node)
        await session.commit()
        return True

    @staticmethod
    def _to_summary(node: Node) -> NodeSummary:
        return NodeSummary(
            id=node.id,
            name=node.name,
            host=node.host,
            port=node.port,
            username=node.username,
            is_pinned=node.is_pinned,
            note=node.note,
            has_password=bool(node.password_encrypted),
            created_at=node.created_at,
            updated_at=node.updated_at,
        )

    @staticmethod
    def _to_detail(node: Node) -> NodeDetail:
        summary = NodeService._to_summary(node)
        return NodeDetail(**summary.model_dump(), password=decrypt_secret(node.password_encrypted))
