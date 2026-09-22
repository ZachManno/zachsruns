from models import DropRequest, RunParticipant


def serialize_run_for_viewer(run, user):
    """Serialize a run and attach the viewer's RSVP plus any pending late drop."""
    run_dict = run.to_dict()
    if not user:
        run_dict['user_status'] = None
        run_dict['pending_drop_status'] = None
        return run_dict

    participation = RunParticipant.query.filter_by(run_id=run.id, user_id=user.id).first()
    drop = DropRequest.query.filter_by(run_id=run.id, user_id=user.id, status='pending').first()
    run_dict['user_status'] = participation.status if participation else None
    run_dict['pending_drop_status'] = drop.requested_status if drop else None
    return run_dict
